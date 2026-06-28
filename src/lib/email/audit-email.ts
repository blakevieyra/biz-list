import type { ComprehensiveAuditResult, ComprehensiveAuditSection } from "@/lib/ai/ai-services";
import { EMAIL_LOGO_CID } from "./logo";
import { getAppUrl } from "./config";

function sc(v: number) {
  if (v >= 75) return { text: "#059669", bg: "#ecfdf5", border: "#6ee7b7" };
  if (v >= 50) return { text: "#d97706", bg: "#fffbeb", border: "#fcd34d" };
  return { text: "#dc2626", bg: "#fef2f2", border: "#fca5a5" };
}

function priorityColor(p: string) {
  if (p === "high") return { bg: "#fee2e2", text: "#b91c1c" };
  if (p === "medium") return { bg: "#fef3c7", text: "#92400e" };
  return { bg: "#f1f5f9", text: "#475569" };
}

function sectionHtml(section: ComprehensiveAuditSection): string {
  const c = sc(section.score);
  const strengths = section.strengths
    .map((s) => `<li style="margin:0 0 6px;font-size:13px;color:#475569;line-height:1.5;">${s}</li>`)
    .join("");
  const gaps = section.gaps
    .map((g) => `<li style="margin:0 0 6px;font-size:13px;color:#475569;line-height:1.5;">${g}</li>`)
    .join("");
  const actions = section.actions
    .map((a) => `<li style="margin:0 0 6px;font-size:13px;color:#475569;line-height:1.5;">→ ${a}</li>`)
    .join("");

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 12px;border:1px solid ${c.border};border-radius:12px;overflow:hidden;">
    <tr>
      <td style="padding:14px 16px;background:${c.bg};">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="width:56px;vertical-align:middle;">
              <div style="width:52px;height:52px;border-radius:50%;background:#ffffff;border:2px solid ${c.border};display:inline-block;text-align:center;line-height:52px;">
                <span style="font-size:20px;font-weight:800;color:${c.text};">${section.score}</span>
              </div>
            </td>
            <td style="padding-left:12px;vertical-align:middle;">
              <p style="margin:0;font-size:15px;font-weight:700;color:#001B44;">${section.label}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.4;">${section.summary}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 16px;background:#ffffff;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="width:33%;vertical-align:top;padding-right:12px;">
              <p style="margin:0 0 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#059669;">Strengths</p>
              <ul style="margin:0;padding-left:0;list-style:none;">${strengths || "<li style='font-size:13px;color:#94a3b8;'>—</li>"}</ul>
            </td>
            <td style="width:33%;vertical-align:top;padding:0 6px;border-left:1px solid #f1f5f9;">
              <p style="margin:0 0 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#dc2626;">Gaps</p>
              <ul style="margin:0;padding-left:0;list-style:none;">${gaps || "<li style='font-size:13px;color:#94a3b8;'>—</li>"}</ul>
            </td>
            <td style="width:33%;vertical-align:top;padding-left:12px;border-left:1px solid #f1f5f9;">
              <p style="margin:0 0 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#007BFF;">Actions</p>
              <ul style="margin:0;padding-left:0;list-style:none;">${actions || "<li style='font-size:13px;color:#94a3b8;'>—</li>"}</ul>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

export function buildAuditEmailHtml(
  result: ComprehensiveAuditResult,
  businessName: string,
  ownerName?: string,
  generatedAt?: string,
): string {
  const appUrl = getAppUrl();
  const date = generatedAt ? new Date(generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const overall = sc(result.overallScore);
  const internal = sc(result.internalScore);
  const external = sc(result.externalScore);

  const scoreCircle = (label: string, value: number, color: ReturnType<typeof sc>, sub?: string) => `
    <td align="center" style="padding:0 8px;">
      <div style="width:76px;height:76px;border-radius:50%;background:${color.bg};border:3px solid ${color.border};margin:0 auto;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:26px;font-weight:800;color:${color.text};line-height:1;">${value}</span>
      </div>
      <p style="margin:8px 0 2px;font-size:12px;font-weight:700;color:#001B44;text-align:center;">${label}</p>
      ${sub ? `<p style="margin:0;font-size:10px;color:#94a3b8;text-align:center;">/100</p>` : ""}
    </td>`;

  const priorityActions = (result.priorityActions ?? [])
    .filter((a) => a.action?.trim())
    .map((a) => {
      const pc = priorityColor(a.priority);
      return `
      <tr>
        <td style="padding:0 0 10px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:12px 14px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:auto;vertical-align:top;padding-right:10px;">
                      <span style="display:inline-block;padding:2px 10px;border-radius:999px;background:${pc.bg};color:${pc.text};font-size:11px;font-weight:700;text-transform:capitalize;">${a.priority}</span>
                      <span style="display:inline-block;margin-left:6px;font-size:11px;color:#94a3b8;">${a.category}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:6px;">
                      <p style="margin:0;font-size:13px;font-weight:600;color:#001B44;line-height:1.5;">${a.action}</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.4;">${a.impact}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join("");

  const internalSections = result.sections.filter((s) => s.phase === "internal").map(sectionHtml).join("");
  const externalSections = result.sections.filter((s) => s.phase === "external").map(sectionHtml).join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AI Business Audit — ${businessName}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#001B44;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #dbe4f0;">

            <!-- Header -->
            <tr>
              <td style="padding:24px 28px 16px;text-align:center;background:linear-gradient(180deg,#f0f7ff 0%,#ffffff 100%);">
                <img src="cid:${EMAIL_LOGO_CID}" alt="BizList" width="160" height="auto" style="max-width:160px;height:auto;display:block;margin:0 auto;" />
                <p style="margin:12px 0 4px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#007BFF;">AI Business Audit Report</p>
                <h1 style="margin:0;font-size:22px;font-weight:800;color:#001B44;">${businessName}</h1>
                <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;">Generated ${date}${ownerName ? ` · Prepared for ${ownerName}` : ""}</p>
              </td>
            </tr>

            <!-- Score circles -->
            <tr>
              <td style="padding:20px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    ${scoreCircle("Overall Score", result.overallScore, overall, "true")}
                    ${scoreCircle("Internal Health", result.internalScore, internal, "true")}
                    ${scoreCircle("External Position", result.externalScore, external, "true")}
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Executive Summary -->
            <tr>
              <td style="padding:0 28px 20px;">
                <div style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;">
                  <p style="margin:0 0 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;">Executive Summary</p>
                  <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">${result.executiveSummary}</p>
                </div>
              </td>
            </tr>

            <!-- Priority Action Plan -->
            <tr>
              <td style="padding:0 28px 20px;">
                <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#001B44;">Priority Action Plan</p>
                <p style="margin:0 0 14px;font-size:12px;color:#94a3b8;">Ranked by impact — tackle high-priority items first.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  ${priorityActions}
                </table>
              </td>
            </tr>

            <!-- Internal Sections -->
            <tr>
              <td style="padding:0 28px 8px;">
                <div style="border-top:2px solid #f1f5f9;padding-top:20px;margin-bottom:12px;">
                  <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#001B44;">Internal Audit</p>
                  <p style="margin:0;font-size:12px;color:#94a3b8;">Operations, finances, team, products, legal, and credibility.</p>
                </div>
                ${internalSections}
              </td>
            </tr>

            <!-- External Sections -->
            <tr>
              <td style="padding:0 28px 28px;">
                <div style="border-top:2px solid #f1f5f9;padding-top:20px;margin-bottom:12px;">
                  <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#001B44;">External Audit</p>
                  <p style="margin:0;font-size:12px;color:#94a3b8;">Market position, customers, brand, growth, and digital activity.</p>
                </div>
                ${externalSections}
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding:0 28px 28px;text-align:center;">
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                  <tr>
                    <td style="border-radius:999px;background:#007BFF;">
                      <a href="${appUrl}/dashboard/assessment" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:999px;">
                        View live report on BizList →
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">Re-run your audit after completing action items to track score improvements.</p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:18px 28px;background:#001B44;color:#94a3b8;font-size:11px;line-height:1.6;text-align:center;border-radius:0 0 20px 20px;">
                This report was generated by BizList's AI audit engine and is confidential to ${businessName}.
                <br />
                <a href="${appUrl}" style="color:#60a5fa;text-decoration:none;">BizList</a> · AI-powered local business growth platform
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildAuditEmailPlainText(result: ComprehensiveAuditResult, businessName: string): string {
  const lines: string[] = [
    `AI BUSINESS AUDIT REPORT — ${businessName.toUpperCase()}`,
    "=".repeat(60),
    "",
    `Overall Score: ${result.overallScore}/100`,
    `Internal Health: ${result.internalScore}/100`,
    `External Position: ${result.externalScore}/100`,
    "",
    "EXECUTIVE SUMMARY",
    "-".repeat(40),
    result.executiveSummary,
    "",
    "PRIORITY ACTION PLAN",
    "-".repeat(40),
    ...(result.priorityActions ?? []).filter((a) => a.action?.trim()).map((a, i) => `${i + 1}. [${a.priority.toUpperCase()}] ${a.category}\n   ${a.action}\n   → ${a.impact}`),
    "",
  ];

  for (const section of result.sections) {
    lines.push(`${section.label.toUpperCase()} — ${section.score}/100`, "-".repeat(40));
    lines.push(section.summary, "");
    if (section.strengths.length) { lines.push("Strengths:"); section.strengths.forEach((s) => lines.push(`  + ${s}`)); lines.push(""); }
    if (section.gaps.length) { lines.push("Gaps:"); section.gaps.forEach((g) => lines.push(`  - ${g}`)); lines.push(""); }
    if (section.actions.length) { lines.push("Actions:"); section.actions.forEach((a) => lines.push(`  → ${a}`)); lines.push(""); }
  }

  lines.push("Generated by BizList · bizlist.app");
  return lines.join("\n");
}
