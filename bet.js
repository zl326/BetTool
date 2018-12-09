


// const myModule = require('./getBets/SkyBet_CornersTakenInEachHalf.js');
const getSkyBets = require('./getBets/getSkyBets.js');


let returned = getSkyBets.getBetsAccumulators(`https://m.skybet.com/football/coupon/10011490`)

returned.then( (results) => {console.log(Object.keys(results))} )
