

async function parseOptions(commander) {
  let options = {}

  if (commander.day) {
    options.day = {daysAhead: isNaN(parseInt(commander.day)) ? 0 : parseInt(commander.day)}
  }

  return Promise.resolve(options)
}

module.exports = {
  parseOptions: parseOptions,
}
