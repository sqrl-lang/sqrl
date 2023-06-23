export const getFileNameForDate = (date: Date) => {
  return date.toISOString().substring(0, "0000-00-00T00:0".length);
};
