import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {scryptSync} from 'node:crypto';
import {sealData} from 'iron-session';
import {authenticated,sessionCookie,validCredentials} from '../lib/auth';
import {handleRequest} from '../lib/http';
const secret='test-session-secret-at-least-thirty-two-characters';
const headers={'content-type':'application/json','x-peladamas-request':'1'};
beforeEach(()=>{
  vi.stubEnv('ADMIN_PASSWORD_HASH','test-salt:'+scryptSync('test-password','test-salt',64).toString('hex'));
  vi.stubEnv('ADMIN_SESSION_SECRET',secret);
});
afterEach(()=>vi.unstubAllEnvs());
describe('Autenticação do administrador',()=>{
  it('aceita somente as credenciais corretas',async()=>{
    expect(await validCredentials('admin','test-password')).toBe(true);
    expect(await validCredentials('other','test-password')).toBe(false);
    expect(await validCredentials('admin','wrong')).toBe(false);
  });
  it('protege leituras e todas as gravações antes de acessar os dados',async()=>{
    expect((await handleRequest('/api/data','GET',null,{})).status).toBe(401);
    for(const action of ['saveRanking','createPelada','savePelada','deletePelada']){
      expect((await handleRequest('/api/data','POST',{action},headers)).status).toBe(401);
    }
  });
  it('recusa POST de formulário e chamadas sem o cabeçalho de proteção',async()=>{
    expect((await handleRequest('/api/auth','POST',{action:'login'},{})).status).toBe(403);
    const cookie=await sessionCookie();
    expect((await handleRequest('/api/data','POST',{action:'deletePelada'},{cookie})).status).toBe(403);
  });
  it('cria sessão HttpOnly e Secure em produção e permite sair',async()=>{
    vi.stubEnv('VERCEL','1');
    const login=await handleRequest('/api/auth','POST',{action:'login',username:'admin',password:'test-password'},headers);
    expect(login.status).toBe(200);
    expect(login.cookie).toContain('HttpOnly');expect(login.cookie).toContain('Secure');
    expect(login.cookie).toContain('SameSite=Strict');
    expect(await authenticated(login.cookie)).toBe(true);
    const logout=await handleRequest('/api/auth','POST',{action:'logout'},headers);
    expect(logout.cookie).toContain('Max-Age=0');
    expect(await authenticated(logout.cookie)).toBe(false);
  });
  it('recusa cookies adulterados e expirados',async()=>{
    expect(await authenticated('peladamas_session=fake')).toBe(false);
    const expired=await sealData({admin:true,expires:Date.now()-1000},{password:secret,ttl:3600});
    expect(await authenticated('peladamas_session='+expired)).toBe(false);
  });
  it('não permite login se a configuração estiver ausente',async()=>{
    vi.stubEnv('ADMIN_SESSION_SECRET','');
    expect((await handleRequest('/api/auth','POST',{action:'login',username:'admin',password:'test-password'},headers)).status).toBe(503);
  });
});
