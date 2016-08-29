'use strict'

var xAxisTranslation = d3.behavior.zoom()
  .scaleExtent([1, 1])
  .translate([startingX, 0])
  .on('zoom', moveXAxis)

// Structure
setupSvgStructure()

// Create Data
retrieveDeliveries()
setInterval(retrieveDeliveries, _POLL_RATE)
window.onresize = resize
