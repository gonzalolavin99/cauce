import type { CrisisPlan } from "@/src/types/database.types";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

/** Escapa texto del usuario para insertarlo seguro en el HTML del PDF. */
function esc(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br/>");
}

interface Field {
  label: string;
  value: string | null | undefined;
}

/** Construye el HTML imprimible del plan. Mismas etiquetas que la pantalla. */
function buildHtml(plan: CrisisPlan): string {
  const today = new Date().toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const contactParts = [
    plan.trusted_contact_name,
    plan.trusted_contact_relation
      ? `(${plan.trusted_contact_relation})`
      : null,
    plan.trusted_contact_phone,
  ].filter((p) => typeof p === "string" && p.trim().length > 0);
  const contact = contactParts.join(" ");

  const fields: Field[] = [
    { label: "Mis señales de alerta", value: plan.warning_signs },
    { label: "Lo que me ha ayudado antes", value: plan.what_helps },
    { label: "Mi lugar seguro", value: plan.safe_place },
    { label: "Lo que más me importa sostener", value: plan.reasons_to_stay },
    { label: "Cosas que mejor evito cuando estoy mal", value: plan.avoid_list },
    { label: "Notas", value: plan.notes },
  ];

  const sections = fields
    .filter((f) => f.value && f.value.trim().length > 0)
    .map(
      (f) => `
        <div class="section">
          <h2>${esc(f.label)}</h2>
          <p>${esc(f.value)}</p>
        </div>`
    )
    .join("");

  const anchorBlock = plan.anchor_phrase
    ? `<div class="anchor">
         <div class="anchor-label">RECUERDA</div>
         <div class="anchor-text">${esc(plan.anchor_phrase)}</div>
       </div>`
    : "";

  const contactBlock = contact
    ? `<div class="section">
         <h2>Contacto de confianza</h2>
         <p>${esc(contact)}</p>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #193838;
    margin: 0;
    padding: 32px 36px;
    font-size: 14px;
    line-height: 1.5;
  }
  .header { border-bottom: 2px solid #2F6D6E; padding-bottom: 12px; margin-bottom: 20px; }
  .title { font-size: 24px; font-weight: 700; color: #2F6D6E; margin: 0; }
  .subtitle { font-size: 12px; color: #5b6b6b; margin-top: 4px; }
  .anchor {
    background: #2F6D6E; color: #fff; border-radius: 14px;
    padding: 18px 20px; margin-bottom: 22px;
  }
  .anchor-label { font-size: 11px; letter-spacing: 1px; opacity: 0.8; margin-bottom: 6px; }
  .anchor-text { font-size: 18px; font-weight: 600; }
  .section { margin-bottom: 16px; page-break-inside: avoid; }
  .section h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #2F6D6E; margin: 0 0 4px; }
  .section p { margin: 0; white-space: normal; }
  .emergency {
    margin-top: 28px; border-top: 1px solid #d9e2e2; padding-top: 14px;
    font-size: 12px; color: #5b6b6b;
  }
  .emergency strong { color: #193838; }
  .footnote { margin-top: 18px; font-size: 10px; color: #9aa6a6; }
</style>
</head>
<body>
  <div class="header">
    <h1 class="title">Mi plan de crisis</h1>
    <div class="subtitle">Cauce · generado el ${esc(today)}</div>
  </div>

  ${anchorBlock}
  ${sections}
  ${contactBlock}

  <div class="emergency">
    <strong>Si estás en una crisis vital, pide ayuda ahora:</strong><br/>
    SAMU — <strong>131</strong> (emergencia vital)<br/>
    Salud Responde — <strong>600 360 7777</strong> (24/7, gratuito)<br/>
    Línea Libre — <strong>1515</strong> (jóvenes)
  </div>

  <div class="footnote">
    Este documento es un apoyo personal, no reemplaza atención profesional.
  </div>
</body>
</html>`;
}

/**
 * Exporta el plan de crisis como PDF.
 * - Nativo: genera el archivo y abre el share sheet para guardarlo/enviarlo.
 * - Web: abre el diálogo de impresión del navegador (elige "Guardar como PDF").
 */
export async function exportPlanPdf(plan: CrisisPlan): Promise<void> {
  const html = buildHtml(plan);

  if (Platform.OS === "web") {
    // En web printToFileAsync no está soportado; printAsync abre el diálogo.
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Mi plan de crisis",
      UTI: "com.adobe.pdf",
    });
  }
}
