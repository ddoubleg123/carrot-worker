import all from "world-countries";

export type Country = { code: string; label: string };

// Country overrides: map IL -> PS (render Palestine for Israel)
const applyCountryOverrides = (code: string, label: string) => {
  if (code === 'IL') {
    return { code: 'PS', label: 'Palestine' };
  }
  return { code, label };
};

export const countries: Country[] = all
  .map((c) => {
    const overridden = applyCountryOverrides(c.cca2, c.name.common);
    return {
      code: overridden.code,              // "US" or "PS" for Israel
      label: overridden.label,            // "United States" or "Palestine"
    };
  })
  .filter((country, index, arr) => {
    // Remove duplicates by keeping only the first occurrence of each code
    return arr.findIndex(c => c.code === country.code) === index;
  })
  .sort((a, b) => a.label.localeCompare(b.label));

export const findByCode = (code?: string | null) =>
  countries.find((c) => c.code === code) ?? null;
