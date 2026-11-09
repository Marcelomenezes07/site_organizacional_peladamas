import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
  },
};

export default function () {
  const resposta = http.get(
    `${__ENV.BASE_URL}/api/pelada?number=${__ENV.PELADA}`
  );

  check(resposta, {
    'retornou sucesso': (r) => r.status === 200,
  });

  sleep(12);
}