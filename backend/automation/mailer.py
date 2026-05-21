import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import os
import json
from datetime import datetime
from automation.browser import DATA_DIR, AUDITORIAS_FILE
from playwright.async_api import async_playwright

async def generate_pdf_report():
    report_path = os.path.join(DATA_DIR, f"Relatorio_Sentinela_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf")
    
    # Gerar HTML
    db = {}
    if os.path.exists(AUDITORIAS_FILE):
        with open(AUDITORIAS_FILE, "r", encoding="utf-8") as f:
            try: db = json.load(f)
            except: pass
            
    # Consolidar TODOS os leads de TODAS as sessões, deduplicando por nome
    # (mantém a entrada mais recente de cada lead)
    leads_map = {}
    for auditoria in db.get("auditores", []):
        for lead in auditoria.get("leads", []):
            nome_key = (lead.get("nome") or "").lower().strip()
            if nome_key:
                existing = leads_map.get(nome_key)
                if not existing or (lead.get("timestamp", "") > existing.get("timestamp", "")):
                    leads_map[nome_key] = lead
    leads = list(leads_map.values())
        
    criticos = sum(1 for l in leads if 'crit' in l.get('classificacao','').lower())
    atencao = sum(1 for l in leads if 'aten' in l.get('classificacao','').lower())
    saudaveis = sum(1 for l in leads if 'saud' in l.get('classificacao','').lower())
    
    html = f"""
    <html>
    <head>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }}
        h1 {{ color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }}
        .summary {{ display: flex; gap: 20px; margin-bottom: 30px; }}
        .card {{ padding: 15px; border-radius: 8px; flex: 1; text-align: center; font-weight: bold; font-size: 18px; }}
        .card-t {{ background: #eff6ff; color: #1e3a8a; border: 1px solid #bfdbfe; }}
        .card-c {{ background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }}
        .card-a {{ background: #fefce8; color: #ca8a04; border: 1px solid #fef08a; }}
        .card-s {{ background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
        th, td {{ padding: 12px; border: 1px solid #ddd; text-align: left; }}
        th {{ background-color: #f8fafc; font-weight: bold; }}
        .status-Critico {{ color: #dc2626; font-weight: bold; }}
        .status-Atencao {{ color: #ca8a04; font-weight: bold; }}
        .status-Saudavel {{ color: #059669; font-weight: bold; }}
    </style>
    </head>
    <body>
        <h1>Relatório Gerencial - Sentinela IA</h1>
        <p>Data de Geração: {datetime.now().strftime('%d/%m/%Y %H:%M')}</p>
        
        <div class="summary">
            <div class="card card-t">Total<br>{len(leads)}</div>
            <div class="card card-c">Críticos<br>{criticos}</div>
            <div class="card card-a">Atenção<br>{atencao}</div>
            <div class="card card-s">Saudáveis<br>{saudaveis}</div>
        </div>
        
        <h2>Detalhamento dos Leads</h2>
        <table>
            <tr>
                <th>Nome do Lead</th>
                <th>Status</th>
                <th>Score</th>
                <th>Tempo Médio Resp.</th>
                <th>Problema Detectado</th>
            </tr>
    """
    
    for l in leads:
        st = l.get('classificacao','').replace('í','i').replace('ç','c')
        t_resp = l.get('tempo_medio_resposta', 'N/D')
        html += f"""
            <tr>
                <td>{l.get('nome','')}</td>
                <td class="status-{st}">{l.get('classificacao','')}</td>
                <td>{l.get('score_engajamento','')}</td>
                <td>{t_resp}</td>
                <td>{l.get('problema_detectado','')}</td>
            </tr>
        """
        
    html += """
        </table>
        <p style="margin-top: 40px; font-size: 12px; color: #666; text-align: center;">Gerado automaticamente por Sentinela IA Automations</p>
    </body>
    </html>
    """
    
    # Converter HTML para PDF usando Playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_content(html)
        await page.pdf(path=report_path, format="A4", print_background=True, margin={"top": "20px", "bottom": "20px", "left": "20px", "right": "20px"})
        await browser.close()
        
    return report_path

async def send_report_email(config, report_path):
    sender = config.get("email_sender", "")
    pwd = config.get("email_password", "")
    to_email = config.get("email_recipient", "")
    
    if not sender or not pwd or not to_email:
        print("[MAILER] Falta configurar credenciais de e-mail.")
        return False
        
    msg = MIMEMultipart()
    msg['From'] = sender
    msg['To'] = to_email
    msg['Subject'] = f"Sentinela IA - Relatório de Auditoria [{datetime.now().strftime('%d/%m/%Y')}]"
    
    body = "Olá,\n\nSegue em anexo o relatório em PDF da última auditoria gerada pelo Sentinela IA.\n\nEquipe Moura Leite."
    msg.attach(MIMEText(body, 'plain', 'utf-8'))
    
    with open(report_path, "rb") as f:
        attach = MIMEApplication(f.read(), _subtype="pdf")
        attach.add_header('Content-Disposition', 'attachment', filename=os.path.basename(report_path))
        msg.attach(attach)
        
    try:
        # Usa SMTP do Outlook como default para maioria das empresas, ou converta pra Gmail (smtp.gmail.com)
        smpt_host = "smtp-mail.outlook.com" if "outlook" in sender or "hotmail" in sender else "smtp.gmail.com"
        port = 587
        
        server = smtplib.SMTP(smpt_host, port)
        server.starttls()
        server.login(sender, pwd)
        server.send_message(msg)
        server.quit()
        print("[MAILER] E-mail enviado com sucesso!")
        return True
    except Exception as e:
        print(f"[MAILER] Erro ao enviar e-mail: {e}")
        return False
