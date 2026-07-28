import app from './app.js';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {

    console.log('');
    console.log('===================================');
    console.log(' SHACK SERVER');
    console.log('===================================');
    console.log(` Listening on port ${PORT}`);
    console.log('');

});
