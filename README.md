# Sia Notes

An encrypted markdown notebook on the Sia network. Notes are stored on decentralized storage providers, not on any central server. No backend, no database, just a browser app talking directly to the network.

## Run locally

```
npm install
npm run dev
```

Open http://localhost:5173, create an account, save your 12-word recovery phrase, then authorize the app on sia.storage. Free tier includes 50 GB storage.

## Notes

Recovery phrase is never stored or sent anywhere. Lose it and you lose access permanently. Markdown is sanitized before rendering since notes can be shared with anyone.
