export type FieldType = "text" | "email" | "number" | "textarea" | "file";

export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  section: string;
  enabled: boolean;
  required: boolean;
  order: number;
  placeholder?: string;
  builtin: boolean;
};

export type AppTheme = {
  sidebar: string;
  background: string;
  primary: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  font: string;
};

export type AppConfig = {
  sections: { id: string; label: string; order: number }[];
  fields: FormField[];
  theme: AppTheme;
};

export const defaultAppConfig: AppConfig = {
  sections: [
    { id: "cliente", label: "Datos del cliente", order: 1 },
    { id: "equipo", label: "Datos del celular", order: 2 },
    { id: "recepcion", label: "Recepción y diagnóstico inicial", order: 3 },
    { id: "cotizacion", label: "Cotización inicial", order: 4 },
    { id: "evidencias", label: "Evidencias de recepción", order: 5 },
  ],
  fields: [
    { id: "customerName", label: "Nombre completo", type: "text", section: "cliente", enabled: true, required: true, order: 1, placeholder: "Nombre del cliente", builtin: true },
    { id: "phone", label: "Celular / WhatsApp", type: "text", section: "cliente", enabled: true, required: true, order: 2, placeholder: "300 000 0000", builtin: true },
    { id: "document", label: "Cédula o NIT", type: "text", section: "cliente", enabled: true, required: false, order: 3, builtin: true },
    { id: "email", label: "Correo electrónico", type: "email", section: "cliente", enabled: true, required: false, order: 4, builtin: true },
    { id: "brand", label: "Marca", type: "text", section: "equipo", enabled: true, required: true, order: 5, placeholder: "Ej. Samsung", builtin: true },
    { id: "model", label: "Modelo", type: "text", section: "equipo", enabled: true, required: true, order: 6, placeholder: "Ej. Galaxy A54", builtin: true },
    { id: "color", label: "Color", type: "text", section: "equipo", enabled: true, required: false, order: 7, builtin: true },
    { id: "imei", label: "IMEI o serial", type: "text", section: "equipo", enabled: true, required: false, order: 8, builtin: true },
    { id: "accessories", label: "Accesorios recibidos", type: "text", section: "equipo", enabled: true, required: false, order: 9, placeholder: "Cargador, estuche, SIM…", builtin: true },
    { id: "reportedIssue", label: "Falla reportada", type: "textarea", section: "recepcion", enabled: true, required: true, order: 10, placeholder: "Describe lo que informa el cliente", builtin: true },
    { id: "physicalCondition", label: "Estado físico al recibir", type: "textarea", section: "recepcion", enabled: true, required: false, order: 11, placeholder: "Rayones, golpes, humedad…", builtin: true },
    { id: "technician", label: "Técnico responsable", type: "text", section: "recepcion", enabled: true, required: false, order: 12, builtin: true },
    { id: "warrantyDays", label: "Días de garantía", type: "number", section: "recepcion", enabled: true, required: false, order: 13, placeholder: "90", builtin: true },
    { id: "laborCost", label: "Mano de obra", type: "number", section: "cotizacion", enabled: true, required: false, order: 14, placeholder: "0", builtin: true },
    { id: "partsCost", label: "Repuestos", type: "number", section: "cotizacion", enabled: true, required: false, order: 15, placeholder: "0", builtin: true },
    { id: "photos", label: "Fotografías del equipo", type: "file", section: "evidencias", enabled: true, required: false, order: 16, builtin: true },
  ],
  theme: {
    sidebar: "#0b1e32", background: "#f4f6f8", primary: "#0d2238",
    surface: "#ffffff", text: "#172331", muted: "#73808c",
    accent: "#b8875b", font: "Inter",
  },
};

const fieldTypes = new Set<FieldType>(["text", "email", "number", "textarea", "file"]);
const fonts = new Set(["Inter", "Arial", "Georgia", "Verdana", "Trebuchet MS"]);
const hex = /^#[0-9a-f]{6}$/i;

export function normalizeAppConfig(value: unknown): AppConfig {
  if (!value || typeof value !== "object") return structuredClone(defaultAppConfig);
  const candidate = value as Partial<AppConfig>;
  const sections = Array.isArray(candidate.sections) ? candidate.sections.slice(0, 20).map((section, index) => ({
    id: String(section?.id ?? `seccion-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || `seccion-${index + 1}`,
    label: String(section?.label ?? `Sección ${index + 1}`).trim().slice(0, 80),
    order: index + 1,
  })) : structuredClone(defaultAppConfig.sections);
  const sectionIds = new Set(sections.map((section) => section.id));
  const fields = Array.isArray(candidate.fields) ? candidate.fields.slice(0, 60).map((field, index) => {
    const rawId = String(field?.id ?? `campo-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50);
    const builtin = defaultAppConfig.fields.some((item) => item.id === rawId);
    return {
      id: rawId || `campo-${index + 1}`,
      label: String(field?.label ?? "Campo").trim().slice(0, 80) || "Campo",
      type: fieldTypes.has(field?.type as FieldType) ? field?.type as FieldType : "text",
      section: sectionIds.has(String(field?.section)) ? String(field?.section) : sections[0]?.id || "cliente",
      enabled: field?.enabled !== false,
      required: field?.required === true,
      order: index + 1,
      placeholder: String(field?.placeholder ?? "").slice(0, 120),
      builtin,
    };
  }) : structuredClone(defaultAppConfig.fields);
  const themeValue = candidate.theme ?? defaultAppConfig.theme;
  const color = (key: keyof Omit<AppTheme, "font">) => hex.test(String(themeValue[key])) ? String(themeValue[key]) : defaultAppConfig.theme[key];
  return {
    sections,
    fields,
    theme: {
      sidebar: color("sidebar"), background: color("background"), primary: color("primary"),
      surface: color("surface"), text: color("text"), muted: color("muted"), accent: color("accent"),
      font: fonts.has(String(themeValue.font)) ? String(themeValue.font) : defaultAppConfig.theme.font,
    },
  };
}
