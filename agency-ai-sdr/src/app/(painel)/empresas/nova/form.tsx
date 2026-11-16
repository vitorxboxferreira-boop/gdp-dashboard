"use client";

import { createCompany } from "@/actions/companies";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";

const CATEGORIES: Array<[string, string]> = [
  ["", "Outra / não sei"], ["beauty_salon", "Salão de beleza"], ["barber_shop", "Barbearia"], ["dentist", "Dentista"],
  ["doctor", "Clínica médica"], ["physiotherapist", "Fisioterapia"], ["veterinary_care", "Veterinária"], ["pet_store", "Pet shop"],
  ["gym", "Academia"], ["car_repair", "Oficina mecânica"], ["auto_parts_store", "Auto peças"], ["restaurant", "Restaurante"],
  ["bakery", "Padaria"], ["cafe", "Café"], ["clothing_store", "Loja de roupas"], ["florist", "Floricultura"],
  ["real_estate_agency", "Imobiliária"], ["lawyer", "Advocacia"], ["accounting", "Contabilidade"],
];

export function NewCompanyForm() {
  return (
    <ActionForm action={createCompany} submitLabel="Cadastrar empresa" pendingLabel="Salvando…">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome *"><input name="name" required maxLength={200} /></Field>
        <Field label="Categoria">
          <select name="primary_category" defaultValue="">
            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Descrição da categoria"><input name="category_label" maxLength={120} placeholder="Ex.: Estética automotiva" /></Field>
        <Field label="Telefone" hint="Com DDD. Ter telefone NÃO autoriza contato por WhatsApp."><input name="phone" inputMode="tel" placeholder="(55) 99999-1234" /></Field>
        <Field label="Endereço"><input name="formatted_address" maxLength={300} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2"><Field label="Cidade *"><input name="city" required defaultValue="Sant'Ana do Livramento" /></Field></div>
          <Field label="UF *"><input name="state" required maxLength={2} defaultValue="RS" /></Field>
        </div>
        <Field label="Site (se houver)" hint="Instagram/Facebook são classificados como “só redes sociais”."><input name="website_uri" type="url" placeholder="https://" /></Field>
        <Field label="Observações"><textarea name="notes" rows={3} maxLength={2000} /></Field>
      </div>
    </ActionForm>
  );
}
