export interface Recording {
  id: string;
  url: string;
  name: string;
  durationSec: number;
  blob?: Blob;
}
