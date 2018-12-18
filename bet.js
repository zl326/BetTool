const commander = require('commander');

const programFunctions = require('./scripts/general/programFunctions.js');
const getBetFunctions = require('./scripts/getBets/getBetFunctions.js');
const processFootball = require('./scripts/processBets/processFootball.js');

// Parse the input arguments
commander
  .version('0.0.0')
  .option('-a, --all', 'All bets')
  .option('-f, --football', 'All football bets')
  .option('--cteh, --cornersTakenInEachHalf', 'Corners Taken in Each Half')
  .option('--tobp, --totalOverBookingPoints', 'Total Over Booking Points')
  .option('--toct, --totalOverCornersTaken', 'Total Over Corners Taken')
  .option('-z, --dummy', 'Dummy')
  .option('-d, --day [value]', 'Query on the nth day ')
  .option('--bs, --binSize [value]', 'Specify number of simultaneous fetches for historic football data')
  .parse(process.argv);

Promise.all([programFunctions.parseOptions(commander), getBetFunctions.getBetConfigs(commander)])
.then( async function(prelimWorkResult) {
  let programOptions = prelimWorkResult[0]
  let betConfigs = prelimWorkResult[1]

  let bets = await getBetFunctions.getBets(betConfigs, programOptions)
  console.log('')

  let promiseArray = []
  for (let category of bets.categories) {
    if (category == 'football') promiseArray.push(processFootball.processFootball(betConfigs, bets, programOptions))
  }

  Promise.all(promiseArray)
})
