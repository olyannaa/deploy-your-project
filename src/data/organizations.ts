export type OrganizationOption = {
  value: string;
  label: string;
  inn?: string;
};

const STORAGE_KEY = "iset.organizations";

const defaultOrganizationOptions: OrganizationOption[] = [];

const readStoredOptions = (): OrganizationOption[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getOrganizationOptions = (): OrganizationOption[] => {
  const stored = readStoredOptions();
  if (stored.length === 0) {
    return [...defaultOrganizationOptions];
  }
  const merged = [...defaultOrganizationOptions];
  stored.forEach((option) => {
    if (!merged.some((existing) => existing.value === option.value)) {
      merged.push(option);
    }
  });
  return merged;
};

export const addOrganizationOption = (option: OrganizationOption) => {
  if (typeof window === "undefined") return;
  const stored = readStoredOptions();
  const next = [...stored.filter((existing) => existing.value !== option.value), option];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const resolveOrganizationName = (value?: string | null) => {
  if (!value) return "";
  const match = getOrganizationOptions().find((option) => option.value === value);
  return match ? match.label : value;
};

export const organizationOptions = defaultOrganizationOptions;
