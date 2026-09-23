/**
 * Deterministic Unit Converter Engine - Expanded
 * Covers 16 physical, electrical, and scientific categories with exact reciprocal conversion factors.
 */

import { UnitCategory, UnitCategoryData } from '../types';
import { sanitizeNumber, formatResult } from './mathEngine';

export const UNIT_CATEGORIES: UnitCategoryData[] = [
  // 1. Length (base: meter)
  {
    id: 'length',
    name: 'Length',
    iconName: 'Ruler',
    units: [
      { id: 'm', name: 'Meters', symbol: 'm', toBase: (v) => v, fromBase: (v) => v },
      { id: 'km', name: 'Kilometers', symbol: 'km', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: 'cm', name: 'Centimeters', symbol: 'cm', toBase: (v) => v / 100, fromBase: (v) => v * 100 },
      { id: 'mm', name: 'Millimeters', symbol: 'mm', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { id: 'mi', name: 'Miles', symbol: 'mi', toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
      { id: 'yd', name: 'Yards', symbol: 'yd', toBase: (v) => v * 0.9144, fromBase: (v) => v / 0.9144 },
      { id: 'ft', name: 'Feet', symbol: 'ft', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
      { id: 'in', name: 'Inches', symbol: 'in', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
      { id: 'nm', name: 'Nanometers', symbol: 'nm', toBase: (v) => v * 1e-9, fromBase: (v) => v / 1e-9 },
    ],
  },

  // 2. Weight / Mass (base: kilogram)
  {
    id: 'weight',
    name: 'Weight & Mass',
    iconName: 'Scale',
    units: [
      { id: 'kg', name: 'Kilograms', symbol: 'kg', toBase: (v) => v, fromBase: (v) => v },
      { id: 'g', name: 'Grams', symbol: 'g', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { id: 'mg', name: 'Milligrams', symbol: 'mg', toBase: (v) => v / 1000000, fromBase: (v) => v * 1000000 },
      { id: 'lb', name: 'Pounds', symbol: 'lb', toBase: (v) => v * 0.45359237, fromBase: (v) => v / 0.45359237 },
      { id: 'oz', name: 'Ounces', symbol: 'oz', toBase: (v) => v * 0.028349523125, fromBase: (v) => v / 0.028349523125 },
      { id: 't', name: 'Metric Tonnes', symbol: 't', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: 'st', name: 'Stone', symbol: 'st', toBase: (v) => v * 6.35029318, fromBase: (v) => v / 6.35029318 },
    ],
  },

  // 3. Temperature (base: Kelvin)
  {
    id: 'temperature',
    name: 'Temperature',
    iconName: 'Thermometer',
    units: [
      { id: 'c', name: 'Celsius', symbol: '°C', toBase: (v) => v + 273.15, fromBase: (v) => v - 273.15 },
      { id: 'f', name: 'Fahrenheit', symbol: '°F', toBase: (v) => ((v - 32) * 5) / 9 + 273.15, fromBase: (v) => ((v - 273.15) * 9) / 5 + 32 },
      { id: 'k', name: 'Kelvin', symbol: 'K', toBase: (v) => v, fromBase: (v) => v },
    ],
  },

  // 4. Area (base: square meter)
  {
    id: 'area',
    name: 'Area',
    iconName: 'Square',
    units: [
      { id: 'sq_m', name: 'Square Meters', symbol: 'm²', toBase: (v) => v, fromBase: (v) => v },
      { id: 'sq_km', name: 'Square Kilometers', symbol: 'km²', toBase: (v) => v * 1000000, fromBase: (v) => v / 1000000 },
      { id: 'sq_ft', name: 'Square Feet', symbol: 'ft²', toBase: (v) => v * 0.09290304, fromBase: (v) => v / 0.09290304 },
      { id: 'sq_yd', name: 'Square Yards', symbol: 'yd²', toBase: (v) => v * 0.83612736, fromBase: (v) => v / 0.83612736 },
      { id: 'acre', name: 'Acres', symbol: 'ac', toBase: (v) => v * 4046.8564224, fromBase: (v) => v / 4046.8564224 },
      { id: 'ha', name: 'Hectares', symbol: 'ha', toBase: (v) => v * 10000, fromBase: (v) => v / 10000 },
    ],
  },

  // 5. Volume (base: liter)
  {
    id: 'volume',
    name: 'Volume',
    iconName: 'Box',
    units: [
      { id: 'l', name: 'Liters', symbol: 'L', toBase: (v) => v, fromBase: (v) => v },
      { id: 'ml', name: 'Milliliters', symbol: 'mL', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { id: 'cu_m', name: 'Cubic Meters', symbol: 'm³', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: 'gal_us', name: 'Gallons (US)', symbol: 'gal', toBase: (v) => v * 3.785411784, fromBase: (v) => v / 3.785411784 },
      { id: 'qt_us', name: 'Quarts (US)', symbol: 'qt', toBase: (v) => v * 0.946352946, fromBase: (v) => v / 0.946352946 },
      { id: 'pt_us', name: 'Pints (US)', symbol: 'pt', toBase: (v) => v * 0.473176473, fromBase: (v) => v / 0.473176473 },
      { id: 'fl_oz', name: 'Fluid Ounces (US)', symbol: 'fl oz', toBase: (v) => v * 0.0295735295625, fromBase: (v) => v / 0.0295735295625 },
    ],
  },

  // 6. Speed (base: meter/second)
  {
    id: 'speed',
    name: 'Speed',
    iconName: 'Gauge',
    units: [
      { id: 'mps', name: 'Meters / second', symbol: 'm/s', toBase: (v) => v, fromBase: (v) => v },
      { id: 'kph', name: 'Kilometers / hour', symbol: 'km/h', toBase: (v) => v / 3.6, fromBase: (v) => v * 3.6 },
      { id: 'mph', name: 'Miles / hour', symbol: 'mph', toBase: (v) => v * 0.44704, fromBase: (v) => v / 0.44704 },
      { id: 'knot', name: 'Knots', symbol: 'kn', toBase: (v) => v * 0.514444, fromBase: (v) => v / 0.514444 },
    ],
  },

  // 7. Time (base: second)
  {
    id: 'time',
    name: 'Time',
    iconName: 'Clock',
    units: [
      { id: 's', name: 'Seconds', symbol: 's', toBase: (v) => v, fromBase: (v) => v },
      { id: 'min', name: 'Minutes', symbol: 'min', toBase: (v) => v * 60, fromBase: (v) => v / 60 },
      { id: 'h', name: 'Hours', symbol: 'h', toBase: (v) => v * 3600, fromBase: (v) => v / 3600 },
      { id: 'd', name: 'Days', symbol: 'd', toBase: (v) => v * 86400, fromBase: (v) => v / 86400 },
      { id: 'wk', name: 'Weeks', symbol: 'wk', toBase: (v) => v * 604800, fromBase: (v) => v / 604800 },
      { id: 'yr', name: 'Years', symbol: 'yr', toBase: (v) => v * 31557600, fromBase: (v) => v / 31557600 },
    ],
  },

  // 8. Pressure (base: Pascal)
  {
    id: 'pressure',
    name: 'Pressure',
    iconName: 'Gauge',
    units: [
      { id: 'pa', name: 'Pascals', symbol: 'Pa', toBase: (v) => v, fromBase: (v) => v },
      { id: 'kpa', name: 'Kilopascals', symbol: 'kPa', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: 'bar', name: 'Bars', symbol: 'bar', toBase: (v) => v * 100000, fromBase: (v) => v / 100000 },
      { id: 'psi', name: 'Pounds / sq inch', symbol: 'psi', toBase: (v) => v * 6894.757, fromBase: (v) => v / 6894.757 },
      { id: 'atm', name: 'Standard Atmospheres', symbol: 'atm', toBase: (v) => v * 101325, fromBase: (v) => v / 101325 },
      { id: 'torr', name: 'Torr (mmHg)', symbol: 'Torr', toBase: (v) => v * 133.322, fromBase: (v) => v / 133.322 },
    ],
  },

  // 9. Energy (base: Joule)
  {
    id: 'energy',
    name: 'Energy',
    iconName: 'Zap',
    units: [
      { id: 'j', name: 'Joules', symbol: 'J', toBase: (v) => v, fromBase: (v) => v },
      { id: 'kj', name: 'Kilojoules', symbol: 'kJ', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: 'cal', name: 'Calories', symbol: 'cal', toBase: (v) => v * 4.184, fromBase: (v) => v / 4.184 },
      { id: 'kcal', name: 'Kilocalories', symbol: 'kcal', toBase: (v) => v * 4184, fromBase: (v) => v / 4184 },
      { id: 'wh', name: 'Watt-hours', symbol: 'Wh', toBase: (v) => v * 3600, fromBase: (v) => v / 3600 },
      { id: 'kwh', name: 'Kilowatt-hours', symbol: 'kWh', toBase: (v) => v * 3600000, fromBase: (v) => v / 3600000 },
      { id: 'btu', name: 'BTUs', symbol: 'BTU', toBase: (v) => v * 1055.056, fromBase: (v) => v / 1055.056 },
    ],
  },

  // 10. Power (base: Watt)
  {
    id: 'power',
    name: 'Power',
    iconName: 'Activity',
    units: [
      { id: 'w', name: 'Watts', symbol: 'W', toBase: (v) => v, fromBase: (v) => v },
      { id: 'kw', name: 'Kilowatts', symbol: 'kW', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: 'mw', name: 'Megawatts', symbol: 'MW', toBase: (v) => v * 1e6, fromBase: (v) => v / 1e6 },
      { id: 'hp', name: 'Horsepower (mechanical)', symbol: 'hp', toBase: (v) => v * 745.69987, fromBase: (v) => v / 745.69987 },
      { id: 'btu_h', name: 'BTU / hour', symbol: 'BTU/h', toBase: (v) => v * 0.293071, fromBase: (v) => v / 0.293071 },
    ],
  },

  // 11. Data (base: Byte)
  {
    id: 'data',
    name: 'Digital Data Storage',
    iconName: 'HardDrive',
    units: [
      { id: 'b', name: 'Bytes', symbol: 'B', toBase: (v) => v, fromBase: (v) => v },
      { id: 'bit', name: 'Bits', symbol: 'bit', toBase: (v) => v / 8, fromBase: (v) => v * 8 },
      { id: 'kb', name: 'Kilobytes (Decimal)', symbol: 'KB', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: 'mb', name: 'Megabytes (Decimal)', symbol: 'MB', toBase: (v) => v * 1e6, fromBase: (v) => v / 1e6 },
      { id: 'gb', name: 'Gigabytes (Decimal)', symbol: 'GB', toBase: (v) => v * 1e9, fromBase: (v) => v / 1e9 },
      { id: 'tb', name: 'Terabytes (Decimal)', symbol: 'TB', toBase: (v) => v * 1e12, fromBase: (v) => v / 1e12 },
      { id: 'kib', name: 'Kibibytes (Binary)', symbol: 'KiB', toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
      { id: 'mib', name: 'Mebibytes (Binary)', symbol: 'MiB', toBase: (v) => v * 1048576, fromBase: (v) => v / 1048576 },
      { id: 'gib', name: 'Gibibytes (Binary)', symbol: 'GiB', toBase: (v) => v * 1073741824, fromBase: (v) => v / 1073741824 },
    ],
  },

  // 12. Frequency (base: Hertz)
  {
    id: 'frequency',
    name: 'Frequency',
    iconName: 'Radio',
    units: [
      { id: 'hz', name: 'Hertz', symbol: 'Hz', toBase: (v) => v, fromBase: (v) => v },
      { id: 'khz', name: 'Kilohertz', symbol: 'kHz', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: 'mhz', name: 'Megahertz', symbol: 'MHz', toBase: (v) => v * 1e6, fromBase: (v) => v / 1e6 },
      { id: 'ghz', name: 'Gigahertz', symbol: 'GHz', toBase: (v) => v * 1e9, fromBase: (v) => v / 1e9 },
      { id: 'rpm', name: 'Revolutions / minute', symbol: 'rpm', toBase: (v) => v / 60, fromBase: (v) => v * 60 },
    ],
  },

  // 13. Voltage (base: Volt)
  {
    id: 'voltage',
    name: 'Voltage',
    iconName: 'BatteryCharging',
    units: [
      { id: 'v', name: 'Volts', symbol: 'V', toBase: (v) => v, fromBase: (v) => v },
      { id: 'mv', name: 'Millivolts', symbol: 'mV', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { id: 'kv', name: 'Kilovolts', symbol: 'kV', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
    ],
  },

  // 14. Current (base: Ampere)
  {
    id: 'current',
    name: 'Current',
    iconName: 'Zap',
    units: [
      { id: 'a', name: 'Amperes', symbol: 'A', toBase: (v) => v, fromBase: (v) => v },
      { id: 'ma', name: 'Milliamperes', symbol: 'mA', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { id: 'ua', name: 'Microamperes', symbol: 'µA', toBase: (v) => v / 1e6, fromBase: (v) => v * 1e6 },
      { id: 'ka', name: 'Kiloamperes', symbol: 'kA', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
    ],
  },

  // 15. Resistance (base: Ohm)
  {
    id: 'resistance',
    name: 'Resistance',
    iconName: 'Sliders',
    units: [
      { id: 'ohm', name: 'Ohms', symbol: 'Ω', toBase: (v) => v, fromBase: (v) => v },
      { id: 'mohm', name: 'Milliohms', symbol: 'mΩ', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { id: 'kohm', name: 'Kilohms', symbol: 'kΩ', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: 'mohm_large', name: 'Megaohms', symbol: 'MΩ', toBase: (v) => v * 1e6, fromBase: (v) => v / 1e6 },
    ],
  },

  // 16. Angle (base: Degree)
  {
    id: 'angle',
    name: 'Angle',
    iconName: 'Compass',
    units: [
      { id: 'deg', name: 'Degrees', symbol: '°', toBase: (v) => v, fromBase: (v) => v },
      { id: 'rad', name: 'Radians', symbol: 'rad', toBase: (v) => (v * 180) / Math.PI, fromBase: (v) => (v * Math.PI) / 180 },
      { id: 'grad', name: 'Gradians', symbol: 'grad', toBase: (v) => (v * 180) / 200, fromBase: (v) => (v * 200) / 180 },
      { id: 'arcmin', name: 'Minutes of Arc', symbol: 'arcmin', toBase: (v) => v / 60, fromBase: (v) => v * 60 },
      { id: 'arcsec', name: 'Seconds of Arc', symbol: 'arcsec', toBase: (v) => v / 3600, fromBase: (v) => v * 3600 },
      { id: 'rev', name: 'Revolutions', symbol: 'rev', toBase: (v) => v * 360, fromBase: (v) => v / 360 },
    ],
  },
];

/**
 * Perform deterministic unit conversion
 */
export function convertUnit(
  category: UnitCategory,
  fromUnitId: string,
  toUnitId: string,
  value: number
): { result: number; display: string; formula: string } {
  if (Number.isNaN(value)) {
    return { result: NaN, display: 'Error', formula: 'Invalid input' };
  }

  const catData = UNIT_CATEGORIES.find((c) => c.id === category);
  if (!catData) {
    return { result: NaN, display: 'Error', formula: `Unknown category: ${category}` };
  }

  const fromUnit = catData.units.find((u) => u.id === fromUnitId);
  const toUnit = catData.units.find((u) => u.id === toUnitId);

  if (!fromUnit || !toUnit) {
    return { result: NaN, display: 'Error', formula: 'Unknown unit selection' };
  }

  if (fromUnitId === toUnitId) {
    return {
      result: value,
      display: formatResult(value),
      formula: `1 ${fromUnit.symbol} = 1 ${toUnit.symbol}`,
    };
  }

  const baseVal = fromUnit.toBase(value);
  const targetVal = toUnit.fromBase(baseVal);
  const cleanedResult = sanitizeNumber(targetVal);

  const base1 = fromUnit.toBase(1);
  const factor = sanitizeNumber(toUnit.fromBase(base1));
  const formula = `1 ${fromUnit.symbol} = ${factor} ${toUnit.symbol}`;

  return {
    result: cleanedResult,
    display: formatResult(cleanedResult),
    formula,
  };
}

export const convertUnits = convertUnit;
