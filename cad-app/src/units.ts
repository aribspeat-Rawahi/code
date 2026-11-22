// All geometry is stored internally in millimetres.
export type Unit = 'mm' | 'cm' | 'm';

export const UNIT_FACTOR: Record<Unit, number> = { mm: 1, cm: 10, m: 1000 };

export const toDisplay = (mm: number, unit: Unit): number =>
  Math.round((mm / UNIT_FACTOR[unit]) * 1e6) / 1e6;

export const fromDisplay = (value: number, unit: Unit): number => value * UNIT_FACTOR[unit];

export const RAD2DEG = 180 / Math.PI;
export const DEG2RAD = Math.PI / 180;
