# Biglietteria 3D · Stadio Angelo Massimino

Biglietteria con lo stadio in 3D (Three.js): scegli la partita, il settore, la fila e il seggiolino, e vedi il campo da quel posto, di notte con i fari accesi.

## Avvio

```
npm install
npm run dev
```

## Logo

Metti il logo ufficiale in `public/img/logo.png` (PNG con sfondo trasparente). Finché manca, compare un segnaposto.

## Dati

Partite, prezzi e settori sono in `src/data.js`. Le foto della home sono in `public/img/` (hero.jpg, card1-3.jpg): per la versione pubblica servono foto di cui avete i diritti.

## GitHub Pages

Push su `main`, poi Settings → Pages → Source: GitHub Actions. Il workflow `.github/workflows/pages.yml` pubblica da solo.

Il pagamento è simulato: per vendere davvero va collegato a un sistema di pagamento e di emissione biglietti.
