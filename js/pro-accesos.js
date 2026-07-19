/* Gestión de accesos — solo superadministradora. */

import { SB, proteger, avisar, escaparHTML } from "./pro.js";

const perfil = await proteger({ superadmin: true });
if (perfil) init(perfil);

function init(perfil) {
  const cuerpo = document.querySelector("#tabla-accesos tbody");
  const conteo = document.getElementById("conteo");
  const vacio = document.getElementById("vacio");

  async function cargar() {
    const { data, error } = await SB
      .from("midig_professionals")
      .select("id, email, nombre, role, active, created_at")
      .order("role", { ascending: true })
      .order("email", { ascending: true });
    if (error) { avisar("Error al cargar: " + error.message); return; }
    conteo.textContent = `· ${data.length}`;
    vacio.hidden = data.length > 0;
    cuerpo.innerHTML = data.map((p) => filaHTML(p, perfil)).join("");
  }

  function filaHTML(p, yo) {
    const esYo = p.email.toLowerCase() === yo.email.toLowerCase();
    const rol = p.role === "superadmin"
      ? '<span class="bristol-tag dura">⭐ Superadmin</span>'
      : '<span class="bristol-tag normal">Profesional</span>';
    const estado = p.active
      ? '<span style="color:var(--good-text)">Activo</span>'
      : '<span style="color:var(--muted)">Desactivado</span>';
    const acciones = esYo
      ? '<span class="hint">— (tu cuenta)</span>'
      : `<div style="display:flex;gap:6px;flex-wrap:wrap">
           <button type="button" class="btn" data-accion="rol" data-id="${p.id}" data-rol="${p.role}" style="padding:6px 10px;min-height:34px">
             ${p.role === "superadmin" ? "Quitar admin" : "Hacer admin"}</button>
           <button type="button" class="btn" data-accion="toggle" data-id="${p.id}" data-active="${p.active}" style="padding:6px 10px;min-height:34px">
             ${p.active ? "Desactivar" : "Activar"}</button>
           <button type="button" class="btn peligro" data-accion="borrar" data-id="${p.id}" data-email="${escaparHTML(p.email)}" style="padding:6px 10px;min-height:34px">Quitar</button>
         </div>`;
    return `<tr>
      <td>${escaparHTML(p.email)}</td>
      <td>${escaparHTML(p.nombre || "—")}</td>
      <td>${rol}</td>
      <td>${estado}</td>
      <td>${acciones}</td>
    </tr>`;
  }

  document.getElementById("form-add").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const email = document.getElementById("add-email").value.trim().toLowerCase();
    const nombre = document.getElementById("add-nombre").value.trim();
    const role = document.querySelector('input[name="add-rol"]:checked').value;
    if (!email) return;
    const btn = document.getElementById("btn-add");
    btn.disabled = true;
    const { error } = await SB.from("midig_professionals").upsert(
      { email, nombre: nombre || null, role, active: true, added_by: perfil.email },
      { onConflict: "email" }
    );
    btn.disabled = false;
    if (error) { avisar("No se pudo añadir: " + error.message); return; }
    avisar("Acceso concedido a " + email);
    ev.target.reset();
    cargar();
  });

  cuerpo.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("button[data-accion]");
    if (!btn) return;
    const id = btn.dataset.id;
    const accion = btn.dataset.accion;

    if (accion === "borrar") {
      if (!confirm(`¿Quitar el acceso de ${btn.dataset.email}?`)) return;
      const { error } = await SB.from("midig_professionals").delete().eq("id", id);
      if (error) { avisar("Error: " + error.message); return; }
      avisar("Acceso retirado");
    } else if (accion === "toggle") {
      const nuevo = btn.dataset.active !== "true";
      const { error } = await SB.from("midig_professionals").update({ active: nuevo }).eq("id", id);
      if (error) { avisar("Error: " + error.message); return; }
      avisar(nuevo ? "Reactivado" : "Desactivado");
    } else if (accion === "rol") {
      const nuevo = btn.dataset.rol === "superadmin" ? "profesional" : "superadmin";
      const { error } = await SB.from("midig_professionals").update({ role: nuevo }).eq("id", id);
      if (error) { avisar("Error: " + error.message); return; }
      avisar("Rol actualizado");
    }
    cargar();
  });

  cargar();
}
