const superagent = require('superagent');
const config = require('./config.js');
const {id, secret, faUri, redirect} = config;
const authCode = Buffer.from(id + ':' + secret).toString('base64');
let code = '';
let token = null;
let tokenHandler = () => null;
const fa_handleToken = (err, response, resolve, reject) => {
  if(err) return reject(err);
  token = response.body;
  const expires = token.expires;
  token.expires = new Date(new Date().getTime() + expires * 1000);
  console.log(tokenHandler.toString());
  tokenHandler(token);
  resolve(token);
};
const fa_doAuth = async () => {
  console.log('do auth')
  return new Promise((resolve, reject) => {
    const grantType = 'authorization_code';
    superagent.post(faUri + 'token_endpoint')
    .set('Authorization', 'Basic ' + authCode)
    .send({
      grant_type: grantType,
      code: code,
      redirect_uri: redirect
    })
    .end((err, response) => {
      if(err) console.log('err', err);
      console.log('got token');
      fa_handleToken(err, response, resolve, reject);
    });
  });
};
const fa_refreshToken = () => {
  return new Promise((resolve, reject) => {
    const grantType = 'refresh_token';
    superagent.post(faUri + 'token_endpoint')
    .set('Authorization', 'Basic ' + authCode)
    .send({
      grant_type: grantType,
      refresh_token: token.refresh_token
    })
    .end((err, response) => {
      if(err) console.log('err', response.body);
      fa_handleToken(err, response, resolve, reject);
    });
  });
};
const fa_apiFetch = (method, uri, subdomain, body, query) => {
  return new Promise(async (resolve, reject) => {
    if(!token) await fa_doAuth();
    if(new Date().getTime() > new Date(token.expires).getTime()) await fa_refreshToken();
    const myreq = superagent[method](faUri + uri);
    if(query) myreq.query(query);
    myreq.set('Authorization', 'Bearer ' + token.access_token)
    .set('Content-Type', 'application/json')
    .set('User-Agent', 'workrApi');
    if(subdomain) myreq.set('X-Subdomain', subdomain);
    myreq.send(body)
    .end((err, response) => {
      if(err) return reject(err);
      response.body.next = (response.links || {}).next;
      resolve(response.body);
    })
  });
};
module.exports = {
  setCode: (_code) => code = _code,
  setToken: (_token) => token = _token,
  setTokenHanlder: (_tokenHanlder) => tokenHandler = _tokenHanlder,
  fetch: fa_apiFetch,
  faUri,
  token
}