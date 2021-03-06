
async function getWeightedAverage(valueArray, weightingsArray) {

  // Deal with valueArray.length < weightingsArray.length
  let weightingsArrayTrimmed = weightingsArray
  if (valueArray.length < weightingsArray.length) {
    // Trim the weightingsArray to be the same size as the valueArray
    weightingsArrayTrimmed = weightingsArray.slice(0,valueArray.length)
  }

  // Normalise the weightings so they sum to one
  let weightingsArraySum = weightingsArrayTrimmed.reduce((a, b) => a + b, 0)
  let weightingsArrayFinal = weightingsArrayTrimmed.map( x => {return x/weightingsArraySum})

  // Calculate the weighted average
  let weightedAverage = 0
  for (let weightingIndex in weightingsArrayFinal) {
    weightingIndex = parseInt(weightingIndex)
    let weighting = weightingsArrayFinal[weightingIndex]
    let value = valueArray[weightingIndex]

    if (typeof value == 'boolean') {
      weightedAverage += value ? weighting : 0
    }
    else if (typeof value == 'number') {
      weightedAverage += value*weighting
    }
    else console.log(`Error! Value to be weighted is neither a number nor a boolean.`)
  }

  return weightedAverage
}

function weightingFunc1() {
  // y = 0.1 + 0.9/(cosh(x/3))

  let weightings = []
  let weightingsSum = 0
  for (let i = 0; i <= 24; i++) {
    weightings.push(0.1 + 0.9/Math.cosh(i/3))
    weightingsSum += weightings[i]
  }

  for (let weightingIndex in weightings) {
    weightings[parseInt(weightingIndex)] /= weightingsSum
  }

  return weightings
}

module.exports = {
  getWeightedAverage: getWeightedAverage,
  weightingFunc1: weightingFunc1,
}
