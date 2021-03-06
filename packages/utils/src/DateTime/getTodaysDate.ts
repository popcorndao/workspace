import { format, sub } from 'date-fns';
import { isTwilight } from './isTwilight';

export interface Options {
  /**
   * will return yesterday's date if current time is between midnight and 6am.
   */
  twilightAdjusted?: boolean;
}
export const getTodaysDate = (_format: string, options?: Options): string => {
  return format(
    options?.twilightAdjusted
      ? isTwilight(new Date().getHours())
        ? sub(new Date(), { days: 1 })
        : new Date()
      : new Date(),
    _format,
  );
};
export default getTodaysDate;
