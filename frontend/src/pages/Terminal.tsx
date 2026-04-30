import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const connect = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Sem token de autenticacao");
      return;
    }

    setConnecting(true);
    setError("");

    const term = new XTerm({
      theme: { background: "#0f172a", foreground: "#e2e8f0", cursor: "#38bdf8" },
      fontFamily: "IBM Plex Mono, Fira Code, Menlo, monospace",
      fontSize: 13,
      cursorBlink: true,
      scrollback: 2000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current!);
    fit.fit();
    termRef.current = term;

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const ws = new WebSocket(`${proto}://${host}/terminal/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setConnecting(false);
    };
    ws.onmessage = (e) => term.write(e.data);
    ws.onclose = () => {
      setConnected(false);
      term.write("\r\n[Conexao encerrada]\r\n");
    };
    ws.onerror = () => {
      setError("Erro na conexao WebSocket");
      setConnecting(false);
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });

    const resizeObs = new ResizeObserver(() => fit.fit());
    resizeObs.observe(containerRef.current!);
    return () => resizeObs.disconnect();
  };

  const disconnect = () => {
    wsRef.current?.close();
    termRef.current?.dispose();
    termRef.current = null;
    wsRef.current = null;
    setConnected(false);
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="panel px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-brand-700">
              Live shell
            </div>
            <h2 className="text-3xl font-bold text-ink-900 md:text-4xl">Terminal SSH</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
              Sessao interativa com a OLT para diagnostico e operacao assistida. Use com cautela em ambiente produtivo.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {connected ? (
              <>
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700">
                  Sessao conectada
                </span>
                <button onClick={disconnect} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100">
                  Desconectar
                </button>
              </>
            ) : (
              <button onClick={connect} disabled={connecting} className="action-primary">
                {connecting ? "Conectando..." : "Conectar"}
              </button>
            )}
          </div>
        </div>
      </header>

      {error && <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="panel-muted px-5 py-4 text-sm text-ink-600">
        Terminal com acesso direto a OLT. Comandos destrutivos sao bloqueados automaticamente, mas ainda assim esta area exige operacao consciente.
      </div>

      <section className="panel overflow-hidden">
        <div
          ref={containerRef}
          className="min-h-[32rem] overflow-hidden rounded-[1.35rem] border border-ink-900/80"
          style={{ background: "#0f172a" }}
        />
      </section>
    </div>
  );
}
