def render_email_template(title: str, heading: str, body_paragraphs: list, cta_text: str = None, cta_url: str = None) -> str:
    """
    Renders a responsive HTML email template matching SkillSphere premium branding.
    """
    paragraphs_html = "".join([f'<p style="margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;">{p}</p>' for p in body_paragraphs])
    
    cta_html = ""
    if cta_text and cta_url:
        cta_html = f'''
        <div style="margin: 32px 0; text-align: center;">
            <a href="{cta_url}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; font-weight: 600; text-decoration: none; border-radius: 8px; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.1), 0 2px 4px -1px rgba(79, 70, 229, 0.06);">
                {cta_text}
            </a>
            <p style="margin: 16px 0 0; color: #94a3b8; font-size: 12px;">
                Link not working? Copy this URL: <br/>
                <a href="{cta_url}" target="_blank" style="color: #4f46e5; text-decoration: underline;">{cta_url}</a>
            </p>
        </div>
        '''

    html_content = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 32px 0;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 32px; text-align: center;">
                            <div style="display: inline-block; margin-bottom: 8px;">
                                <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                    <tr>
                                        <td style="vertical-align: middle; padding-right: 10px;">
                                            <span style="display: inline-block; width: 28px; height: 28px; background-color: #863bff; border-radius: 6px; text-align: center; line-height: 28px; color: #ffffff; font-weight: 900; font-family: 'Outfit', 'Inter', Arial, sans-serif; font-size: 18px; box-shadow: 0 2px 4px rgba(134, 59, 255, 0.3);">S</span>
                                        </td>
                                        <td style="vertical-align: middle;">
                                            <span style="font-family: 'Outfit', 'Inter', Arial, sans-serif; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">SkillSphere</span>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px; font-weight: 500;">Your AI-First Study Companion</p>
                        </td>
                    </tr>
                    
                    <!-- Content Body -->
                    <tr>
                        <td style="padding: 40px 32px;">
                            <h2 style="margin: 0 0 20px; color: #0f172a; font-size: 20px; font-weight: 755; letter-spacing: -0.3px;">{heading}</h2>
                            {paragraphs_html}
                            {cta_html}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f1f5f9; padding: 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; font-weight: 600;">SkillSphere Inc.</p>
                            <p style="margin: 0 0 16px; color: #94a3b8; font-size: 11px;">100 Pine Street, San Francisco, CA 94111</p>
                            <p style="margin: 0 0 8px; color: #94a3b8; font-size: 11px;">© {2026} SkillSphere. All rights reserved.</p>
                            <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                                You are receiving this because you signed up for a SkillSphere account. <br/>
                                <a href="#" style="color: #64748b; text-decoration: underline;">Unsubscribe</a> • <a href="#" style="color: #64748b; text-decoration: underline;">Support</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
'''
    return html_content
