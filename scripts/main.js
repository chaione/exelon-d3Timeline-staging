'use strict'

var xAxisTranslation = d3.behavior.zoom()
  .scaleExtent([1, 1])
  .translate([startingX, 0])
  .on('zoom', moveXAxis)

// Structure
setupSvgStructure()

// Create Data
retrieveDeliveries()
setInterval(retrieveDeliveries, _DS.POLL_RATE)

// Bind Refresh Button
$(document).ready(function () {
  $('#refresh-button').on('click', function () {
    if (!_DS.IS_REFRESHING) {
      $(this).addClass('active')
      _DS.IS_REFRESHING = true
      retrieveDeliveries()
    }
  })
})

window.onresize = resize
