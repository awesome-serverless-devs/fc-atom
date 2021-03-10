export interface IFCTOKEN {
  type: string;
  user: number;
  region: string;
  service: string;
  function: string;
}

export interface IOSSTOKEN {
  type: string;
  bucket: string;
  region: string;
}

export function isFcToken (args: any): args is IFCTOKEN {
  return args.service !== undefined;
}