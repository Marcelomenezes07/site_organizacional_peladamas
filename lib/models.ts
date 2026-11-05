export type Player = {
  id: string;
  name: string;
  aliases: string;
  stars: number;
  goals?:number;
  assists?:number;
};
export type Ranking = { players: Player[]; etag: string | null };
export type Pelada = { number: number; createdAt: string; players: Player[]; etag: string | null };
export type AppState = { ranking: Ranking; peladas: Pelada[]; nextPeladaNumber?:number };

// Jogadores fictícios para demonstração. Dados reais ficam somente no armazenamento privado.
export const starterPlayers: Player[] = Array.from({length:22},(_,i)=>({
  id: `j${String(i+1).padStart(3,'0')}`, name: i===0?'Jogador Á':`Jogador ${String(i+1).padStart(2,'0')}`,
  aliases:'', stars: (i%5)+1
}));
