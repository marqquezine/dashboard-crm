import { useState, useEffect } from "react";

const SUPABASE_URL = "https://wkdmsjyokqerxsafmulj.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZG1zanlva3FlcnhzYWZtdWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NTc4MzcsImV4cCI6MjA3OTQzMzgzN30.jYOMQsV8KTzOQQpogUHJpL9d_PBCxP3spFAfW5s959Q";

const STAGES = [
  { id: 1, label: "Iniciou", color: "#6366f1", desc: "Primeira mensagem" },
  { id: 2, label: "Preço", color: "#8b5cf6", desc: "Teste de viabilidade" },
  { id: 3, label: "Engajado", color: "#a78bfa", desc: "Interesse real pela consulta" },
  { id: 4, label: "Link enviado", color: "#f59e0b", desc: "Aguardando agendamento" },
  { id: 5, label: "Agendado", color: "#10b981", desc: "Confirmou consulta" },
];

function formatPhone(tel) {
  if (!tel) return "—";
  const clean = tel.replace(/\D/g, "");
  if (clean.length === 11) return `(${clean.slice(0,2)}) ${clean.slice(2,7)}-${clean.slice(7)}`;
  if (clean.length === 13) return `+${clean.slice(0,2)} (${clean.slice(2,4)}) ${clean.slice(4,9)}-${clean.slice(9)}`;
  return tel;
}

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return `${dt.getDate().toString().padStart(2,"0")}/${(dt.getMonth()+1).toString().padStart(2,"0")}`;
}

function timeAgo(d) {
  if (!d) return "—";
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff/60)}min`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  return `${Math.floor(diff/86400)}d`;
}

async function fetchLeads(range) {
  const now = new Date();
  const start = new Date(now);
  if (range === "7d") start.setDate(now.getDate() - 7);
  else if (range === "30d") start.setDate(now.getDate() - 30);
  else if (range === "all") start.setFullYear(2000);

  const url = `${SUPABASE_URL}/rest/v1/dados_cliente?select=*&created_at=gte.${start.toISOString()}&order=created_at.desc`;
  const res = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  if (!res.ok) throw new Error("Erro ao buscar dados");
  return res.json();
}

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("pipeline");
  const [filtroEstágio, setFiltroEstágio] = useState(null);
  const [range, setRange] = useState("7d");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchLeads(range)
      .then(setLeads)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [range]);

  const leadsFiltered = filtroEstágio ? leads.filter((l) => l.estagio === filtroEstágio) : leads;
  const countByStage = STAGES.map((s) => ({ ...s, count: leads.filter((l) => l.estagio === s.id).length }));
  const agendados = leads.filter((l) => l.estagio === 5).length;
  const convRate = leads.length > 0 ? ((agendados / leads.length) * 100).toFixed(0) : 0;

  let mediaFunil = "—";
  const comLink = leads.filter((l) => l.estagio >= 4 && l.estagio_atualizado_em && l.created_at);
  if (comLink.length > 0) {
    const soma = comLink.reduce((acc, l) => acc + (new Date(l.estagio_atualizado_em) - new Date(l.created_at)), 0);
    const dias = soma / comLink.length / 86400000;
    mediaFunil = dias < 1 ? `${Math.round(dias * 24)}h` : `${dias.toFixed(1)}d`;
  }

  const origens = {};
  leads.forEach((l) => { const o = l.origem || "Não definida"; origens[o] = (origens[o] || 0) + 1; });
  const origemList = Object.entries(origens).sort((a, b) => b[1] - a[1]);
  const origemColors = { YouTube: "#ef4444", Indicação: "#10b981", Instagram: "#8b5cf6", Google: "#3b82f6", "Não definida": "#4b5563" };

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Pipeline de Leads</h1>
          <p style={styles.subtitle}>Consultório Dr. Guilherme Marquezine · {leads.length} leads carregados</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={styles.rangeRow}>
            {["7d","30d","all"].map((r) => (
              <button key={r} onClick={() => setRange(r)} style={{ ...styles.rangeBtn, ...(range === r ? styles.rangeBtnActive : {}) }}>
                {r === "7d" ? "7 dias" : r === "30d" ? "30 dias" : "Todos"}
              </button>
            ))}
          </div>
          <div style={styles.tabRow}>
            <button style={{ ...styles.tabBtn, ...(tab === "pipeline" ? styles.tabActive : {}) }} onClick={() => setTab("pipeline")}>Pipeline</button>
            <button style={{ ...styles.tabBtn, ...(tab === "relatório" ? styles.tabActive : {}) }} onClick={() => setTab("relatório")}>Relatório</button>
          </div>
        </div>
      </div>

      {loading && <div style={styles.center}>Carregando dados do Supabase...</div>}
      {error && <div style={{ ...styles.center, color: "#ef4444" }}>Erro: {error}</div>}

      {!loading && !error && tab === "pipeline" && (
        <>
          <div style={styles.stageRow}>
            {countByStage.map((s) => (
              <button
                key={s.id}
                onClick={() => setFiltroEstágio(filtroEstágio === s.id ? null : s.id)}
                style={{
                  ...styles.stageCard,
                  borderColor: filtroEstágio === s.id ? s.color : "transparent",
                  background: filtroEstágio === s.id ? `${s.color}12` : "#f5f7fa",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ ...styles.stageDot, background: s.color }} />
                  <span style={styles.stageLabel}>{s.label}</span>
                </div>
                <span style={{ ...styles.stageCount, color: s.color }}>{s.count}</span>
                <span style={styles.stageDesc}>{s.desc}</span>
              </button>
            ))}
          </div>

          <div style={styles.funnelContainer}>
            <span style={styles.funnelLabel}>Funil</span>
            <div style={styles.funnelBar}>
              {countByStage.map((s) => {
                const pct = leads.length > 0 ? (s.count / leads.length) * 100 : 0;
                return <div key={s.id} title={`${s.label}: ${s.count}`} style={{ width: `${pct}%`, background: s.color, height: "100%", minWidth: pct > 0 ? 8 : 0 }} />;
              })}
            </div>
            <span style={styles.funnelConv}>Conversão: {convRate}%</span>
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Contato</th>
                  <th style={styles.th}>Entrada</th>
                  <th style={styles.th}>Estágio</th>
                  <th style={styles.th}>Atualizado</th>
                  <th style={styles.th}>Origem</th>
                </tr>
              </thead>
              <tbody>
                {leadsFiltered.map((lead) => {
                  const stage = STAGES.find((s) => s.id === lead.estagio) || STAGES[0];
                  return (
                    <tr key={lead.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.contactCell}>
                          <div style={{ ...styles.avatar, background: stage.color }}>{(lead.nomewpp || "?")[0]}</div>
                          <div>
                            <div style={styles.contactName}>{lead.nomewpp || "Sem nome"}</div>
                            <div style={styles.contactPhone}>{formatPhone(lead.telefone)}</div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}><span style={styles.dateTag}>{formatDate(lead.created_at)}</span></td>
                      <td style={styles.td}>
                        <div style={styles.stageTagRow}>
                          <div style={{ ...styles.stagePipSmall, background: stage.color }} />
                          <span style={{ ...styles.stageTag, color: stage.color, background: `${stage.color}18` }}>{stage.label}</span>
                        </div>
                      </td>
                      <td style={styles.td}><span style={styles.timeTag}>{timeAgo(lead.estagio_atualizado_em)}</span></td>
                      <td style={styles.td}><span style={styles.origemTag}>{lead.origem || "—"}</span></td>
                    </tr>
                  );
                })}
                {leadsFiltered.length === 0 && (
                  <tr><td colSpan={5} style={{ ...styles.td, textAlign: "center", color: "#5a6270", padding: 32 }}>Nenhum lead neste filtro</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && !error && tab === "relatório" && (
        <>
          <div style={styles.kpiRow}>
            {[
              { label: "Total de Leads", value: leads.length, sub: "No período selecionado", color: "#6366f1" },
              { label: "Agendamentos", value: agendados, sub: "Confirmaram consulta", color: "#10b981" },
              { label: "Taxa de Conversão", value: `${convRate}%`, sub: "Leads que agendaram", color: "#f59e0b" },
              { label: "Média no Funil", value: mediaFunil, sub: "Até receber o link", color: "#8b5cf6" },
            ].map((kpi, i) => (
              <div key={i} style={styles.kpiCard}>
                <div style={{ ...styles.kpiAccent, background: kpi.color }} />
                <span style={styles.kpiLabel}>{kpi.label}</span>
                <span style={{ ...styles.kpiValue, color: kpi.color }}>{kpi.value}</span>
                <span style={styles.kpiSub}>{kpi.sub}</span>
              </div>
            ))}
          </div>

          <div style={styles.reportRow}>
            <div style={styles.reportCard}>
              <h3 style={styles.reportTitle}>Origem dos Leads</h3>
              {origemList.length === 0 && <p style={{ color: "#5a6270", fontSize: 13, margin: 0 }}>Nenhuma origem registrada ainda.</p>}
              {origemList.map(([origem, count]) => {
                const pct = (count / leads.length) * 100;
                const color = origemColors[origem] || "#6366f1";
                return (
                  <div key={origem} style={styles.origemRow}>
                    <div style={styles.origemRowTop}>
                      <span style={styles.origemName}>{origem}</span>
                      <span style={{ ...styles.origemPct, color }}>{count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div style={styles.barBg}>
                      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={styles.reportCard}>
              <h3 style={styles.reportTitle}>Distribuição por Estágio</h3>
              {countByStage.map((s) => {
                const pct = leads.length > 0 ? (s.count / leads.length) * 100 : 0;
                return (
                  <div key={s.id} style={styles.origemRow}>
                    <div style={styles.origemRowTop}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                        <span style={styles.origemName}>{s.label}</span>
                      </div>
                      <span style={{ ...styles.origemPct, color: s.color }}>{s.count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div style={styles.barBg}>
                      <div style={{ width: `${pct}%`, height: "100%", background: s.color, borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}

              {(() => {
                const parados = leads.filter((l) => l.estagio === 1 && l.estagio_atualizado_em && (Date.now() - new Date(l.estagio_atualizado_em).getTime()) > 86400000);
                if (parados.length === 0) return null;
                return (
                  <div style={styles.alertBox}>
                    <span style={styles.alertIcon}>⚠️</span>
                    <div>
                      <span style={styles.alertTitle}>{parados.length} lead{parados.length > 1 ? "s" : ""} parado{parados.length > 1 ? "s" : ""} no estágio 1</span>
                      <span style={styles.alertDesc}>Sem avanço por mais de 24h.</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div style={styles.resumoCard}>
            <h3 style={styles.reportTitle}>📋 Resumo</h3>
            <p style={styles.resumoText}>
              No período selecionado chegaram <strong>{leads.length} leads</strong> pelo WhatsApp.
              Deles, <strong>{agendados} confirmaram agendamento</strong>, resultando em uma taxa de conversão de {convRate}%.
              {mediaFunil !== "—" && <> O tempo médio até receber o link foi de <strong>{mediaFunil}</strong>.</>}
              {origemList.length > 0 && origemList[0][0] !== "Não definida" && <> A maior parte dos contatos veio por <strong>{origemList[0][0]}</strong>.</>}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#f5f7fa", color: "#1f2937", fontFamily: "'DM Sans','Segoe UI',sans-serif", padding: "28px 24px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  title: { fontSize: 24, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.5px" },
  subtitle: { fontSize: 12, color: "#6b7280", margin: "4px 0 0" },
  center: { textAlign: "center", padding: 48, color: "#6b7280", fontSize: 14 },
  rangeRow: { display: "flex", gap: 3, background: "#1a1d27", borderRadius: 7, padding: 2 },
  rangeBtn: { background: "transparent", border: "none", color: "#6b7280", fontSize: 12, fontWeight: 500, padding: "5px 10px", borderRadius: 5, cursor: "pointer" },
  rangeBtnActive: { background: "#2a2d3a", color: "#e2e4e9" },
  tabRow: { display: "flex", gap: 3, background: "#1a1d27", borderRadius: 7, padding: 2 },
  tabBtn: { background: "transparent", border: "none", color: "#6b7280", fontSize: 12, fontWeight: 500, padding: "5px 12px", borderRadius: 5, cursor: "pointer" },
  tabActive: { background: "#6366f1", color: "#fff" },
  stageRow: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  stageCard: { flex: "1 1 130px", background: "#ffffff", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column", gap: 3, textAlign: "left" },
  stageDot: { width: 7, height: 7, borderRadius: "50%" },
  stageLabel: { fontSize: 12, fontWeight: 600, color: "#1f2937" },
  stageCount: { fontSize: 20, fontWeight: 700, marginTop: 1 },
  stageDesc: { fontSize: 10, color: "#5a6270" },
  funnelContainer: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  funnelLabel: { fontSize: 10, color: "#5a6270", textTransform: "uppercase", letterSpacing: 1, minWidth: 36 },
  funnelBar: { flex: 1, height: 7, borderRadius: 4, background: "#1a1d27", display: "flex", overflow: "hidden", gap: 2 },
  funnelConv: { fontSize: 11, color: "#10b981", fontWeight: 600, minWidth: 80, textAlign: "right" },
  tableContainer: { background: "#161822", borderRadius: 10, overflow: "auto", border: "1px solid #222636" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 600 },
  th: { fontSize: 10, fontWeight: 600, color: "#5a6270", textTransform: "uppercase", letterSpacing: 0.8, padding: "10px 14px", textAlign: "left", borderBottom: "1px solid #1e2230", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #1e2230" },
  td: { padding: "11px 14px", fontSize: 13, verticalAlign: "middle" },
  contactCell: { display: "flex", alignItems: "center", gap: 9 },
  avatar: { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 },
  contactName: { fontWeight: 600, color: "#e2e4e9", fontSize: 13 },
  contactPhone: { fontSize: 11, color: "#5a6270" },
  dateTag: { fontSize: 12, color: "#8891a0" },
  stageTagRow: { display: "flex", alignItems: "center", gap: 5 },
  stagePipSmall: { width: 6, height: 6, borderRadius: "50%" },
  stageTag: { fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 20 },
  timeTag: { fontSize: 12, color: "#6b7280" },
  origemTag: { fontSize: 11, fontWeight: 500, color: "#8891a0", background: "#1a1d27", padding: "2px 7px", borderRadius: 5 },
  kpiRow: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  kpiCard: { flex: "1 1 150px", background: "#161822", border: "1px solid #222636", borderRadius: 10, padding: "16px 16px 14px", display: "flex", flexDirection: "column", gap: 3, position: "relative", overflow: "hidden" },
  kpiAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  kpiLabel: { fontSize: 10, color: "#5a6270", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 3 },
  kpiValue: { fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px" },
  kpiSub: { fontSize: 10, color: "#5a6270" },
  reportRow: { display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" },
  reportCard: { flex: "1 1 280px", background: "#161822", border: "1px solid #222636", borderRadius: 10, padding: 18 },
  reportTitle: { fontSize: 13, fontWeight: 600, color: "#e2e4e9", margin: "0 0 14px" },
  origemRow: { marginBottom: 12 },
  origemRowTop: { display: "flex", justifyContent: "space-between", marginBottom: 5 },
  origemName: { fontSize: 12, color: "#c8cdd5", fontWeight: 500 },
  origemPct: { fontSize: 11, fontWeight: 600 },
  barBg: { height: 5, background: "#1a1d27", borderRadius: 4, overflow: "hidden" },
  alertBox: { display: "flex", gap: 9, alignItems: "flex-start", marginTop: 16, background: "#1f1a0e", border: "1px solid #3a2e1a", borderRadius: 7, padding: "9px 11px" },
  alertIcon: { fontSize: 15, flexShrink: 0 },
  alertTitle: { display: "block", fontSize: 12, fontWeight: 600, color: "#f59e0b" },
  alertDesc: { display: "block", fontSize: 10, color: "#8891a0", marginTop: 1 },
  resumoCard: { background: "#161822", border: "1px solid #222636", borderRadius: 10, padding: 20 },
  resumoText: { fontSize: 13, color: "#8891a0", lineHeight: 1.7, margin: 0 },
};
