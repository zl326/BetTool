const commander = require('commander');

const helperFunctions = require('./scripts/general/helperFunctions.js');
const getBetFunctions = require('./scripts/getBets/getBetFunctions.js');
const processFootball = require('./scripts/processBets/processFootball.js');

// Parse the input arguments
commander
  .version('0.0.0')
  .option('-a, --all', 'All bets')
  .option('-f, --football', 'All football bets')
  .option('--cteh, --cornersTakenInEachHalf', 'Corners Taken in Each Half')
  .option('--tobp, --totalOverBookingPoints', 'Total Over Booking Points')
  .option('--pl, --premierLeague', 'Premier League')
  .option('-z, --dummy', 'Dummy')
  .option('-d, --day [value]', 'Query on the nth day ')
  .parse(process.argv);

Promise.all([helperFunctions.parseOptions(commander), getBetFunctions.getBetConfigs(commander)])
.then( async function(prelimWorkResult) {
  let programOptions = prelimWorkResult[0]
  let betConfigs = prelimWorkResult[1]

  let bets = await getBetFunctions.getBets(betConfigs, programOptions)
  console.log('')

  let promiseArray = []
  for (let category of bets.categories) {
    if (category == 'football') promiseArray.push(processFootball.processFootball(betConfigs, bets))
  }

  Promise.all(promiseArray)
})
