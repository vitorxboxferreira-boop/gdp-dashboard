import { describe, expect, it } from "vitest";
import { guessCategory, parseCompanyList } from "@/lib/import-companies";

const d = { city: "Sant'Ana do Livramento", state: "RS" };

describe("importação de lista de empresas", () => {
  it("lê CSV com ; e normaliza telefone, site, categoria e fonte", () => {
    const r = parseCompanyList(
      `nome;categoria;telefone;endereco;site;fonte
Barbearia Central;Barbearia;(55) 99999-1234;Rua A, 10;instagram.com/barbearia;https://exemplo.com/lista
"Padaria; Pão Quente";Padaria;3242-1234;;;guia local`, d);
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ name: "Barbearia Central", primary_category: "barber_shop", phone_e164: "+5555999991234", website_status: "social_only", city: d.city, state: "RS" });
    expect(r.rows[0].notes).toContain("Fonte: https://exemplo.com/lista");
    expect(r.rows[1]).toMatchObject({ name: "Padaria; Pão Quente", primary_category: "bakery", phone_e164: null, website_status: "not_identified" });
    expect(r.rows[1].notes).toContain("Telefone informado não validado: 3242-1234");
  });
  it("aceita vírgula e tabulação; exige coluna nome; aponta linhas inválidas", () => {
    expect(parseCompanyList("nome,telefone\nLoja X,55 3242 1234", d).rows[0].phone_e164).toBe("+555532421234");
    expect(parseCompanyList("empresa\ttelefone\nLoja Y\t", d).rows).toHaveLength(1);
    expect(parseCompanyList("telefone\n123", d).errors[0].reason).toMatch(/nome/);
    expect(parseCompanyList("nome\nA", d).errors[0]).toMatchObject({ line: 2 });
  });
  it("não aceita esquema perigoso em site", () => {
    const r = parseCompanyList("nome;site\nLoja Z;javascript:alert(1)", d);
    expect(r.rows[0].website_uri).toBeNull();
    expect(r.rows[0].website_status).toBe("not_identified");
  });
  it("adivinha categoria", () => {
    expect(guessCategory("Clínica odontológica")).toBe("dentist");
    expect(guessCategory("Coisa desconhecida")).toBeNull();
  });
});
