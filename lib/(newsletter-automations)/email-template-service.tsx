import { NewsletterData } from "@/lib/(newsletter-automations)/types";
import { deriveNewsletterLeadFromStories } from "@/lib/(newsletter-automations)/newsletter-lead";
import {
  buildNewsletterStoryHref,
  normalizeSiteBase,
} from "@/lib/(newsletter-automations)/newsletter-links";

const siteBase =
  normalizeSiteBase(
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SITE_URL : undefined,
  );

const escapeHtml = (s: string) =>
  (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safeUrl = (s: string) => (s || "").trim();

export const generateEmailHtml = (data: NewsletterData): string => {
  const title = escapeHtml(data.title || "Daily Brief");
  const date = escapeHtml(data.date || "");
  const copyrightYear = new Date().getFullYear();
  const leadPlain =
    (data.intro || "").trim() ||
    deriveNewsletterLeadFromStories(data.stories);
  const intro = escapeHtml(leadPlain);
  const signOff = escapeHtml(data.signOff || "Stay sharp. We'll see you tomorrow.");

  const renderButton = (
    href: string,
    label: string,
    bg: string,
    align: "left" | "center" = "left",
  ) => {
    const url = safeUrl(href);
    const text = escapeHtml(label);

    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" ${align === "center" ? 'align="center"' : ""}
  style="border-collapse:collapse;${align === "center" ? "margin:0 auto;" : ""}">
  <tr>
    <td align="${align}">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
        href="${url}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="50%" stroke="f" fillcolor="${bg}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">
          ${text}
        </center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <a href="${url}" target="_blank"
        style="display:inline-block;background-color:${bg};color:#ffffff;font-weight:bold;text-decoration:none;
               padding:14px 28px;border-radius:50px;font-size:13px;text-transform:uppercase;letter-spacing:1px;
               font-family:Arial,sans-serif;mso-padding-alt:14px 28px;">
        ${text}
      </a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
  };

  const renderSocialIconLink = (
    href: string,
    label: string,
    imageUrl: string,
  ) => `
<a href="${safeUrl(href)}" target="_blank" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"
  style="display:inline-block;padding:6px;line-height:1;text-align:center;color:#334155;text-decoration:none;">
  <img src="${safeUrl(imageUrl)}" alt="${escapeHtml(label)}" width="22" height="22"
    style="display:block;width:22px;height:22px;border:0;outline:none;text-decoration:none;" />
</a>`;

  const storyHtml = (data.stories || [])
    .map((story) => {
      const category = escapeHtml(story.category || "General");
      const headline = escapeHtml(story.headline || "");
      const href = buildNewsletterStoryHref(story, siteBase, {
        fallbackToHome: true,
      });
      const imageUrl = story.imageUrl ? safeUrl(story.imageUrl) : "";

      const parts = (story.summary || "")
        .split(/[\u2022\u2023\u25E6\u2043\u2219\*]|\r?\n/)
        .map((p) => p.trim())
        .filter(Boolean);

      const introParagraph = escapeHtml(parts[0] || "");
      const listItems = parts.slice(1).map(escapeHtml);

      const bullets =
        listItems.length > 0
          ? `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse; margin:0 0 25px;">
  ${listItems
    .map(
      (item, idx) => `
  <tr>
    <td width="20" valign="top" style="font-size:22px;color:#0ea5e9;padding-right:12px;line-height:1;font-weight:bold;">•</td>
    <td valign="top" style="font-size:15px;line-height:1.6;color:#475569;${idx === listItems.length - 1 ? "padding-bottom:0;" : "padding-bottom:18px;"}text-align:left;font-family:Arial,sans-serif;">
      ${item}
    </td>
  </tr>`
    )
    .join("")}
</table>`
          : "";

      const hero =
        imageUrl
          ? `
<a href="${href}" target="_blank" style="text-decoration:none;">
  <img src="${imageUrl}" alt="${headline}" width="540"
    style="display:block;width:100%;max-width:540px;height:auto;border:0;outline:none;text-decoration:none;border-radius:8px;margin:0 0 24px;" />
</a>`
          : "";

      return `
<tr>
  <td style="padding:45px 30px;border-bottom:1px solid #f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="font-size:11px;font-weight:800;color:#0ea5e9;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;">
      ${category}
    </div>

    ${hero}

    <div style="font-size:26px;font-weight:800;line-height:1.25;margin:0 0 18px;color:#0f172a;">
      <a href="${href}" target="_blank" style="color:#0f172a;text-decoration:none;">
        ${headline}
      </a>
    </div>

    ${
      introParagraph
        ? `<div style="font-size:16px;line-height:1.6;color:#475569;margin:0 0 20px;">${introParagraph}</div>`
        : ""
    }

    ${bullets}

    ${renderButton(href, "READ FULL STORY  ➔", "#0ea5e9")}
  </td>
</tr>`;
    })
    .join("");

  /**
   * OVERFLOW FIX:
   * - Use a 100% wrapper table (fits inside GHL's editor column)
   * - Inner container table is width:100% with max-width:600px
   * - No hard 600px that can force overflow inside editor wrappers
   */
  return `
<!-- FULL-WIDTH WRAPPER (prevents overflow in GHL Design Editor) -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
  style="width:100%;border-collapse:collapse;background-color:#f8fafc;margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:0;">

      <!-- INNER CONTAINER: fluid width + max width -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
        style="width:100%;max-width:600px;border-collapse:collapse;background-color:#ffffff;mso-table-lspace:0pt;mso-table-rspace:0pt;">
        <tr>
          <td style="padding:0;">

            <!-- CONTENT TABLE -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
              style="width:100%;border-collapse:collapse;background-color:#ffffff;">

              <!-- HEADER -->
              <tr>
                <td align="center" style="padding:50px 30px;border-bottom:3px solid #000000;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                  <img src="https://storage.googleapis.com/msgsndr/VPl4AjuzzxeZqlljHIdI/media/694189977109a8d55b5f1658.png"
                    alt="Kind Joe Logo" width="180"
                    style="display:block;margin:0 auto;width:180px;max-width:180px;height:auto;border:0;outline:none;text-decoration:none;" />
                  <div style="height:15px;line-height:15px;font-size:1px;">&nbsp;</div>

                  <div style="font-size:32px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;margin:0;color:#000000;line-height:1.2;">
                    DAILY BRIEF
                  </div>

                  <div style="margin-top:10px;font-size:13px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:2px;">
                    ${date}
                  </div>
                </td>
              </tr>

              ${
                leadPlain
                  ? `<!-- INTRO -->
              <tr>
                <td style="padding:35px 30px;border-bottom:1px solid #f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                  <div style="font-size:18px;line-height:1.7;color:#334155;font-style:italic;margin:0;border-left:4px solid #0ea5e9;padding-left:20px;text-align:left;">
                    ${intro}
                  </div>
                </td>
              </tr>`
                  : ""
              }

              <!-- STORIES -->
              ${storyHtml}

              <!-- FOOTER -->
              <tr>
                <td align="center" style="padding:50px 30px;background-color:#ffffff;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                  <div style="font-size:16px;color:#475569;font-style:italic;margin:0;line-height:1.6;">
                    ${signOff}
                  </div>

                  <div style="margin:40px 0 30px;">
                    ${renderButton("https://www.youtube.com/@thekindjoe-w4d", "► Subscribe on YouTube", "#FF0000", "center")}
                  </div>

                  <div style="margin-bottom:40px;">
                    <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="padding:0 10px;">
                          ${renderSocialIconLink(
                            "https://www.instagram.com/thekindjoe/",
                            "Instagram",
                            "https://assets.cdn.filesafe.space/VPl4AjuzzxeZqlljHIdI/media/69eb86cc6c819d3c6f5a0587.png",
                          )}
                        </td>
                        <td style="padding:0 10px;">
                          ${renderSocialIconLink(
                            "https://linkedin.com/company/the-kind-joe",
                            "LinkedIn",
                            "https://assets.cdn.filesafe.space/VPl4AjuzzxeZqlljHIdI/media/69eb86cddc89af9203232b83.png",
                          )}
                        </td>
                      </tr>
                    </table>
                  </div>

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                    style="border-top:1px solid #f1f5f9;margin-top:20px;border-collapse:collapse;">
                    <tr>
                      <td align="center" style="text-align:center;color:#94a3b8;font-family:Arial,sans-serif;font-size:10px;line-height:1.8;padding-top:30px;letter-spacing:1px;">
                        <div style="margin:0 0 15px;text-transform:uppercase;">
                          You are receiving this email because you are a valued member of the KindJoe community.
                        </div>
                        <div style="margin:0;font-weight:bold;color:#64748b;">
                          &copy; ${copyrightYear} KindJoe. All rights reserved.
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
            <!-- /CONTENT TABLE -->

          </td>
        </tr>
      </table>
      <!-- /INNER CONTAINER -->

    </td>
  </tr>
</table>
`.trim();
};
