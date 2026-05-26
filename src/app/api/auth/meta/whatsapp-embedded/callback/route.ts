import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Conectando...</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: #f9fafb;
          color: #374151;
        }
        .container {
          text-align: center;
        }
        .loader {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #25D366;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="loader"></div>
        <p>${error ? 'Error en la conexión' : 'Conectando con Imalá Vox...'}</p>
      </div>
      <script>
        try {
          const code = ${JSON.stringify(code)};
          const error = ${JSON.stringify(error)};
          
          if (window.opener) {
            if (code) {
              window.opener.postMessage({ type: 'WA_SIGNUP_CODE', code: code }, '*');
            } else if (error) {
              window.opener.postMessage({ type: 'WA_SIGNUP_ERROR', error: error }, '*');
            }
          }
        } catch (e) {
          console.error(e);
        } finally {
          window.close();
        }
      </script>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
