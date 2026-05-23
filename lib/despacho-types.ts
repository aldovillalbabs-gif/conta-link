export type DespachoData = {
  id: string;
  nombre: string;
  invitation_token: string;
  invitation_url: string;
  rol: "admin" | "contador";
};

export type ContadorDespachoItem = {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "contador";
};

export type ContadorProfile = {
  id: string;
  rol: "admin" | "contador";
  despacho_id: string;
};
