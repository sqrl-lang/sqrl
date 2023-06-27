import { getFileNameForDate } from "./getFileNameForDate";
import type { EventData } from "./types";

const getDateFromEventObject = (
  event: Record<string, unknown>,
  fieldName: string
): Date => {
  const value = event[fieldName];
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }
  throw new Error("Invalid date JSONPath value");
};

export interface EventDomainOptions {
  /** Prefix for URLs containing event data */
  urlPrefix: string;
  /** The date that event processing begins. This value will be rounded to the nearest ten minute interval. */
  cursor: Date;
  /** Name of the date field in the event object */
  dateFieldName: string;
  /** Event processing speed in milliseconds. Specify "realtime" if you'd like events to be processed in... _realtime_. */
  speed: number | "realtime";
}

export class EventDomain {
  constructor({ urlPrefix, cursor, dateFieldName, speed }: EventDomainOptions) {
    this.cursor = cursor;
    this.dateFieldName = dateFieldName;
    this.speed = speed;
    this.urlPrefix = urlPrefix;
    this.dataPromise = this.fetchData();
  }

  // user-configurable options
  private cursor: Date;
  private dateFieldName: string;
  private speed: number | "realtime";
  private urlPrefix: string;

  private events: EventData[] = [];
  private eventIndex = 0;

  private dataPromise: Promise<void> | null = null;

  public setCursor(newDate: Date) {
    const oldFileName = getFileNameForDate(this.cursor);
    const newFileName = getFileNameForDate(newDate);
    if (oldFileName !== newFileName) {
      this.cursor = newDate;
      this.dataPromise = this.fetchData();
    }
  }

  public async fetchData() {
    const filename = getFileNameForDate(this.cursor);

    const jsonUrl = `${this.urlPrefix}${filename}.json`;
    const result = await fetch(jsonUrl);
    if (result.status !== 200) {
      throw new Error(
        "Non-200 status: " + result.status + ". " + result.statusText
      );
    }
    const resultJson = await result.json();
    if (!Array.isArray(resultJson.events)) {
      throw new Error("expected an array");
    }
    this.eventIndex = 0;
    this.events = resultJson.events;
  }

  async getNextEventDelay(): Promise<number> {
    let eventDelay: number;
    // ensure we have fetched event data
    await this.dataPromise;
    const metadata: Record<string, any> = { speed: this.speed };
    if (this.eventIndex === 0) {
      metadata.isFirstItem = true;
      eventDelay = 0;
    } else {
      const previousEvent = this.events[this.eventIndex - 1];
      const currentEvent = this.events[this.eventIndex];

      if (this.eventIndex >= this.events.length) {
        metadata.isLastItem = true;
        const maxTime = new Date();
        // 11 minute offset = 10 minutes for the window + 1 minute for some extra forgiveness
        maxTime.setMinutes(maxTime.getMinutes() - 11);

        const updatedWindowDate = new Date(this.cursor);
        updatedWindowDate.setMinutes(this.cursor.getMinutes() + 10);
        if (updatedWindowDate > maxTime) {
          metadata.updateWindowExceeded = true;
          eventDelay = updatedWindowDate.valueOf() - maxTime.valueOf();
        } else {
          metadata.updateWindowExceeded = false;
          // immediately fetch the next batch
          // TODO(meyer) use `this.speed` here
          eventDelay = 0;
        }
      } else if (this.speed === "realtime") {
        metadata.isRealtime = true;
        // calculate the number of milliseconds between event timestamps
        // TODO(meyer) probably just easier to divide 10 minutes by event count
        eventDelay = Math.max(
          getDateFromEventObject(currentEvent, this.dateFieldName).valueOf() -
            getDateFromEventObject(previousEvent, this.dateFieldName).valueOf(),
          0
        );
      } else {
        metadata.fallback = true;
        eventDelay = this.speed;
      }
    }
    return eventDelay;
  }

  async processNextEvent<T>(
    processFn: (event: EventData) => Promise<T>
  ): Promise<T> {
    if (this.eventIndex >= this.events.length) {
      const maxTime = new Date();
      // 11 minute offset = 10 minutes for the window + 1 minute for some extra forgiveness
      maxTime.setMinutes(maxTime.getMinutes() - 11);
      this.cursor.setMinutes(this.cursor.getMinutes() + 10);
      if (this.cursor > maxTime) {
        // TODO(meyer) sleep for this many milliseconds? hmmm...
        throw Error(
          "Cannot fetch more events, please wait " +
            (this.cursor.valueOf() - maxTime.valueOf()) / 1000 +
            " more seconds"
        );
      }
      this.dataPromise = this.fetchData();
    }

    await this.dataPromise;
    const event = this.events[this.eventIndex];
    const result = await processFn(event);
    this.eventIndex++;
    return result;
  }
}
