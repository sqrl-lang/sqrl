interface Closeable {
    close(): void;
}
export declare class CloseableGroup {
    private list;
    private closed;
    add(obj: Closeable): void;
    close(): void;
}
export {};
