export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  position: string;
  photo?: string;
  bio?: string;
  expanded?: boolean;
}