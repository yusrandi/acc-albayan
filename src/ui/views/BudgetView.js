/**
 * AL BAYAN HIDAYATULLAH MAKASSAR — Budget View
 * Budget vs realization monitoring, interactive spreadsheet, and live calculation
 */
window.App = window.App || {};
window.App.UI = window.App.UI || {};
window.App.UI.Views = window.App.UI.Views || {};

(function (Views, UseCases, Repositories, Utils) {
  function bindBudgetLiveCalculation() {
    document.querySelectorAll('#budgetTable tr[data-budget-id]').forEach(row => {
      const p = row.querySelector('.b-plan');
      const a = row.querySelector('.b-actual');
      const update = () => {
        const plan = Number(p?.value) || 0;
        const actual = Number(a?.value) || 0;
        const remain = plan - actual;
        const rp = plan ? (actual / plan) * 100 : 0;
        const sp = plan ? (remain / plan) * 100 : 0;

        const s = row.querySelector('.b-selisih');
        const pc = row.querySelector('.b-pct');
        const sc = row.querySelector('.b-sisa-pct');
        const st = row.querySelector('.b-status span');

        if (s) s.textContent = Utils.rupiah(remain);
        if (pc) pc.textContent = rp.toFixed(1) + '%';
        if (sc) sc.textContent = sp.toFixed(1) + '%';
        if (st) {
          const isOver = actual > plan;
          const isDone = actual === plan && plan > 0;
          const isRun = actual > 0;
          st.textContent = isOver ? 'OVER BUDGET' : (isDone ? 'SELESAI' : (isRun ? 'BERJALAN' : 'BELUM REALISASI'));
          st.className = 'mini-badge ' + (isOver ? 'badge-over' : (isDone ? 'badge-done' : (isRun ? 'badge-run' : 'badge-zero')));
        }
      };

      p?.addEventListener('input', update);
      a?.addEventListener('input', update);
      update();
    });
  }

  Views.BudgetView = {
    render() {
      const summary = UseCases.BudgetUseCase.getBudgetSummary();
      const { plan, actual, remain, pct, over, rows } = summary;

      // Update KPIs
      const setTxt = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
      };

      setTxt('budgetPlan', Utils.rupiah(plan));
      setTxt('budgetActual', Utils.rupiah(actual));
      setTxt('budgetPct', pct.toFixed(1) + '%');
      setTxt('budgetRemain', Utils.rupiah(remain));

      // Bar Chart
      const max = Math.max(...rows.map(x => Number(x.plan) || 0), 1);
      const chart = document.getElementById('budgetChart');
      if (chart) {
        chart.innerHTML = rows.length ? rows.map((x, i) => {
          const p = Number(x.plan) || 0;
          const a = Number(x.actual) || 0;
          const rp = p ? (a / p) * 100 : 0;
          return `<div class="budget-bar-row">
            <div class="budget-bar-head"><span>${i + 1}. ${Utils.esc(x.unit || 'Umum')} — ${Utils.esc(x.name)}</span><b>${Utils.rupiah(a)} / ${Utils.rupiah(p)}</b></div>
            <div class="budget-track"><div class="budget-plan" style="width:${Math.min(100, (p / max) * 100)}%"></div><div class="budget-actual" style="width:${Math.min(100, (a / max) * 100)}%"></div></div>
            <div class="budget-percent">${rp.toFixed(1)}% terealisasi • Sisa ${Utils.rupiah(p - a)}</div>
          </div>`;
        }).join('') : '<div class="empty-ranking">Belum ada data anggaran.</div>';
      }

      // Donut Chart
      const d = document.getElementById('budgetDonut');
      if (d) {
        const share = plan ? Math.min(100, Math.max(0, pct)) : 0;
        d.innerHTML = `
          <div class="budget-donut" style="--p:${share}%"><div><b>${pct.toFixed(1)}%</b><span>Realisasi</span></div></div>
          <div class="budget-legend">
            <p><i class="plan"></i> Anggaran <b>${Utils.rupiah(plan)}</b></p>
            <p><i class="actual"></i> Realisasi <b>${Utils.rupiah(actual)}</b></p>
            <p><i class="remain"></i> Sisa <b>${Utils.rupiah(remain)}</b></p>
            ${over ? `<p><i class="over"></i> Over Budget <b>${Utils.rupiah(over)}</b></p>` : ''}
          </div>
        `;
      }

      // Spreadsheet Table
      const table = document.getElementById('budgetTable');
      if (table) {
        table.innerHTML = rows.length ? `
          <div class="budget-spreadsheet-toolbar">
            <div><b>HAMPARAN ANGGARAN & REALISASI PROGRAM</b><span>${rows.length} program/kegiatan • dapat diedit langsung</span></div>
            <button class="btn primary" onclick="window.App.UI.Views.BudgetView.openForm()">＋ Tambah Baris</button>
          </div>
          <div class="budget-table-wrap budget-spreadsheet">
            <table class="table budget-edit-table">
              <thead><tr>
                <th>NO</th><th>DEVISI / UNIT</th><th>PROGRAM / KEGIATAN / AKUN</th>
                <th>ANGGARAN</th><th>REALISASI</th><th>SISA</th><th>% REALISASI</th><th>% SISA</th><th>STATUS</th><th>AKSI</th>
              </tr></thead>
              <tbody>${rows.map((x, i) => {
                const p = Number(x.plan) || 0;
                const a = Number(x.actual) || 0;
                const sel = p - a;
                const pr = p ? (a / p) * 100 : 0;
                const sisaPct = p ? (sel / p) * 100 : 0;
                const status = a > p ? 'OVER BUDGET' : (a === p && p > 0 ? 'SELESAI' : (a > 0 ? 'BERJALAN' : 'BELUM REALISASI'));
                return `<tr data-budget-id="${Utils.esc(x.id)}">
                  <td class="row-no">${i + 1}</td>
                  <td><input class="b-unit cell-input" value="${Utils.esc(x.unit || '')}" placeholder="Unit/Divisi"></td>
                  <td><input class="b-name cell-input wide" value="${Utils.esc(x.name || '')}" placeholder="Program / Kegiatan / Akun"></td>
                  <td><input class="b-plan num-input cell-input" type="number" min="0" step="0.01" value="${p}"></td>
                  <td><input class="b-actual num-input cell-input" type="number" min="0" step="0.01" value="${a}"></td>
                  <td class="b-selisih money-cell">${Utils.rupiah(sel)}</td>
                  <td class="b-pct pct-cell">${pr.toFixed(1)}%</td>
                  <td class="b-sisa-pct pct-cell">${sisaPct.toFixed(1)}%</td>
                  <td class="b-status"><span class="mini-badge ${a > p ? 'badge-over' : (a === p && p > 0 ? 'badge-done' : (a > 0 ? 'badge-run' : 'badge-zero'))}">${status}</span></td>
                  <td class="action-cell">
                    <button class="btn primary" onclick="window.App.UI.Views.BudgetView.saveRow('${Utils.esc(x.id)}')">Simpan</button>
                    <button class="btn danger" onclick="window.App.UI.Views.BudgetView.delete('${Utils.esc(x.id)}')">Hapus</button>
                  </td>
                </tr>`;
              }).join('')}</tbody>
              <tfoot><tr class="budget-total-row">
                <td colspan="3"><b>TOTAL ANGGARAN PROGRAM</b></td>
                <td class="total-plan"><b>${Utils.rupiah(plan)}</b></td>
                <td class="total-actual"><b>${Utils.rupiah(actual)}</b></td>
                <td class="total-remain"><b>${Utils.rupiah(remain)}</b></td>
                <td class="total-pct"><b>${pct.toFixed(1)}%</b></td>
                <td class="total-sisa-pct"><b>${(plan ? (remain / plan) * 100 : 0).toFixed(1)}%</b></td>
                <td colspan="2"><b>${over ? `OVER ${Utils.rupiah(over)}` : 'TERKENDALI'}</b></td>
              </tr></tfoot>
            </table>
          </div>
        ` : '<div class="empty-ranking">Belum ada data anggaran. Klik “Tambah Anggaran” untuk membuat item.</div>';

        bindBudgetLiveCalculation();
      }

      this.renderDashboardCard(summary);
    },

    renderDashboardCard(summary) {
      if (!summary) summary = UseCases.BudgetUseCase.getBudgetSummary();
      const { plan, actual, remain, pct, rows } = summary;

      const setTxt = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
      };

      setTxt('dashBudgetPlan', Utils.rupiah(plan));
      setTxt('dashBudgetActual', Utils.rupiah(actual));
      setTxt('dashBudgetPct', pct.toFixed(1) + '%');
      setTxt('dashBudgetRemain', Utils.rupiah(remain));

      const bars = document.getElementById('dashBudgetBars');
      const top = rows.slice().sort((a, b) => (Number(b.plan) || 0) - (Number(a.plan) || 0)).slice(0, 8);
      const max = Math.max(...top.map(x => Number(x.plan) || 0), 1);
      if (bars) {
        bars.innerHTML = top.length ? top.map((x, i) => {
          const p = Number(x.plan) || 0;
          const a = Number(x.actual) || 0;
          const rp = p ? Math.min(100, (a / p) * 100) : 0;
          return `<div class="dash-budget-row">
            <div class="dash-budget-head"><span>${i + 1}. ${Utils.esc(x.unit || 'Umum')} — ${Utils.esc(x.name)}</span><b>${Utils.rupiah(a)} / ${Utils.rupiah(p)}</b></div>
            <div class="dash-budget-track"><div class="dash-budget-plan" style="width:${(p / max) * 100}%"></div><div class="dash-budget-actual" style="width:${(a / max) * 100}%"></div></div>
            <div class="dash-budget-pct">${rp.toFixed(1)}% terealisasi</div>
          </div>`;
        }).join('') : '<div class="empty-ranking">Belum ada data anggaran.</div>';
      }

      const donut = document.getElementById('dashBudgetDonut');
      if (donut) {
        const safe = Math.max(0, Math.min(100, pct));
        donut.style.setProperty('--p', safe + '%');
        donut.querySelector('b').textContent = pct.toFixed(1) + '%';
      }

      const leg = document.getElementById('dashBudgetLegend');
      if (leg) {
        leg.innerHTML = `
          <div><i class="plan"></i><span>Anggaran</span><b>${Utils.rupiah(plan)}</b></div>
          <div><i class="actual"></i><span>Realisasi</span><b>${Utils.rupiah(actual)}</b></div>
          <div><i class="remain"></i><span>Sisa</span><b>${Utils.rupiah(remain)}</b></div>
        `;
      }
    },

    openForm(id) {
      const budgets = Repositories.StorageRepository.getBudgets();
      const old = budgets.find(x => x.id === id);

      window.App.Router.openModal(`
        <div class="modalhead">
          <h3>${id ? 'Edit' : 'Tambah'} Program Anggaran</h3>
          <button class="x" onclick="window.App.Router.closeModal()">×</button>
        </div>
        <div class="form" style="margin-top:15px">
          <div class="field">
            <label>Devisi / Unit</label>
            <input id="budUnit" value="${Utils.esc(old?.unit || '')}" placeholder="Contoh: Pendidikan / Yayasan / Humas">
          </div>
          <div class="field">
            <label>Nama Program / Kegiatan / Akun</label>
            <input id="budName" value="${Utils.esc(old?.name || '')}" placeholder="Contoh: Renovasi Fasilitas Santri">
          </div>
          <div class="grid g2">
            <div class="field">
              <label>Nilai Anggaran (Rp)</label>
              <input id="budPlan" type="number" min="0" step="0.01" value="${old?.plan ?? 0}">
            </div>
            <div class="field">
              <label>Realisasi Tercatat (Rp)</label>
              <input id="budActual" type="number" min="0" step="0.01" value="${old?.actual ?? 0}">
            </div>
          </div>
          <button class="btn primary" onclick="window.App.UI.Views.BudgetView.submitForm('${Utils.esc(id || '')}')">Simpan Anggaran</button>
        </div>
      `);
    },

    submitForm(id) {
      const unit = document.getElementById('budUnit')?.value;
      const name = document.getElementById('budName')?.value;
      const plan = document.getElementById('budPlan')?.value;
      const actual = document.getElementById('budActual')?.value;

      try {
        UseCases.BudgetUseCase.saveBudget({ id, unit, name, plan, actual });
        window.App.Router.closeModal();
        window.App.Router.renderAll();
      } catch (e) {
        alert(e.message);
      }
    },

    saveRow(id) {
      const row = document.querySelector(`[data-budget-id="${CSS.escape(id)}"]`);
      if (!row) return;

      const unit = row.querySelector('.b-unit')?.value;
      const name = row.querySelector('.b-name')?.value;
      const plan = row.querySelector('.b-plan')?.value;
      const actual = row.querySelector('.b-actual')?.value;

      try {
        UseCases.BudgetUseCase.saveBudget({ id, unit, name, plan, actual });
        window.App.Router.renderAll();
      } catch (e) {
        alert(e.message);
      }
    },

    delete(id) {
      if (!confirm('Hapus data anggaran ini?')) return;
      UseCases.BudgetUseCase.deleteBudget(id);
      window.App.Router.renderAll();
    }
  };
})(window.App.UI.Views, window.App.UseCases, window.App.Repositories, window.App.Utils);

// Global aliases for existing buttons
window.openBudgetForm = id => window.App.UI.Views.BudgetView.openForm(id);
window.saveBudgetRow = id => window.App.UI.Views.BudgetView.saveRow(id);
window.deleteBudget = id => window.App.UI.Views.BudgetView.delete(id);
window.renderBudgetPage = () => window.App.UI.Views.BudgetView.render();
window.renderDashboardBudget = () => window.App.UI.Views.BudgetView.renderDashboardCard();
