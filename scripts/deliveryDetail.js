/* global _, d3 */
var pocContacts = ['POC', 'Delta10']
var inspectionLabels = ['Scheduled', 'Actual']

function displayDetail (delivery) {
  var currentDeliveryRaw = _.find(_DS.deliveries, {id: delivery.key})
  delivery.status = currentDeliveryRaw.attributes.status
  delivery.eta = currentDeliveryRaw.attributes.eta
  delivery.arriveAt = utils.getNullOrDate(currentDeliveryRaw.attributes['arrive-at'])
  var pocId = (currentDeliveryRaw['relationships']['primary-poc']['data'] || {}).id

  delivery.primaryPocName = utils.getPocNameById(pocId)

  delivery.delay = utils.detailCalculateDelay(delivery)

  delivery.infoBoxCurrStation = calculateInfoboxCurrStation(delivery)

  _DS.isDetailDisplayed = true
  detailYStart = 0

  var eventHeight = 30
  var detailPadding = 30
  detailDeliveryRectY = yDeliveryScale(delivery.yIndex + 1) - detailPadding - (2 * eventHeight)
  var detailDeliveryRectHeight = ((_POSTS.length + 1) * eventHeight) + (detailPadding * 2) + 50

  if (detailDeliveryRectY < 50) {
    detailDeliveryRectY = 50
  } else if (detailDeliveryRectY > innerHeight - _X_AXIS_HEIGHT - detailDeliveryRectHeight) {
    detailDeliveryRectY = innerHeight - _X_AXIS_HEIGHT - detailDeliveryRectHeight
  }
  // detailDeliveryRectY = detailDeliveryRectY+100
  // detailSvg
  //     detailDeliveryCloseRect
  //     detailDeliveryRect
  // here goes the gradient
  //     detailDeliveryDataGroup
  //         detailDeliveryYAxisGroup
  //         detailDeliveryDataScheduledGroup
  //         detailDeliveryDataActualGroup
  //         (vehicle diamond)
  //         detailDeliveryDataEventsGroup
  //     detailCommunicationDefaultLabel - "Scheduled", "Actual" Label
  //     detailCommunicationLabel - other communication Labels
  //     detailDeliveryStationLabel
  //     detailDeliveryInfoGroup
  //         detailDeliveryInfoRect
  //         detailDeliveryInfoPOC
  //         detailDeliveryInfoCompanyName

  // setup the popup
  detailSvg = d3.select('body').append('svg')
    .attr('width', outerWidth)
    .attr('height', outerHeight - _X_AXIS_HEIGHT)
    .attr('id', 'detailSvg')
    .style('opacity', .97)
    .call(xAxisTranslation)

  // setup click to close
  var detailDeliveryCloseRect = detailSvg.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', outerWidth)
    .attr('height', outerHeight - _X_AXIS_HEIGHT)
    .attr('class', 'detailDeliveryCloseRect')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
    .on('click', function () {
      dismissDeliveryDetail()
    })

  // setup the text box on the top roght corner
  var detailDeliveryRect = detailSvg.append('rect')
    .attr('x', 0)
    .attr('y', detailDeliveryRectY)
    .attr('width', outerWidth)
    .attr('height', detailDeliveryRectHeight)
    .attr('opacity', 1)
    .attr('class', function (d) {
      return 'detailDeliveryRect'
    })
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

  if (delivery.status === 'denied') {
    var detailDeliveryStatusText = detailSvg.append('text')
      .attr('x', outerWidth - 20)
      .attr('y', detailDeliveryRectY + detailDeliveryRectHeight - 20)
      .text('!! DENYING ENTRY !!')
      .attr('class', 'deliveryStatuss denied')
      .attr('text-anchor', 'end')
      .attr('font-size', stationTextHeight + 'px')

    detailSvg.append('image')
      .attr('xlink:href', function (i) {
        return 'img/icn-timeline-denied-panel.png'
      })
      .attr('height', detailDeliveryRectHeight)
      .attr('width', outerWidth)
      .attr('x', 0)
      .attr('y', 0)
      // .attr("class", "truckIconDiamond")
      .attr('preserveAspectRatio', 'xMidYMid slice')
      // .attr("viewBox","0 0 " + 1236 + " " + 522)
      .attr('transform', function (d) {return 'translate(' + 0 + ',' + detailDeliveryRectY + ')'})
  }

  var detailDeliveryStationLabel = detailSvg.append('text')
    .attr('x', 10)
    .attr('y', detailDeliveryRectY - 10)
    .text(function(d) {
      return utils.getLocationNameFromRawDelivery(delivery)
    })
    .attr('class', 'detailName')
    .attr('font-size', stationTextHeight + 'px')

  // Positioning
  var detailDeliveryInfoGroup = detailSvg.append('g')
    .attr('transform', 'translate(' + (outerWidth - 344 - 20) + ',' + (detailDeliveryRectY - 50) + ')')

  // Styling
  if (delivery.status === 'denied') {
    var detailDeliveryInfoRect = detailDeliveryInfoGroup.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 344)
      .attr('height', 65)
      .attr('class', 'detailInfoRectDenied')
  } else {
    var detailDeliveryInfoRect = detailDeliveryInfoGroup.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 344)
      .attr('height', 65)
      .attr('class', 'detailInfoRect')
  }

  // POC Info
  var detailDeliveryInfoPOC = detailDeliveryInfoGroup.append('text')
    .attr('x', 16)
    .attr('y', 26)
    .text(delivery.primaryPocName)
    .attr('class', 'detailInfoPOC')
    .attr('font-size', 16 + 'px')

  var detailDeliveryInfoCompanyName = detailDeliveryInfoGroup.append('text')
    .attr('x', 16)
    .attr('y', 46)
    .text(delivery.vendorName + ' ' + delivery.infoBoxCurrStation)
    .attr('class', 'detailInfoCompanyName')
    .attr('font-size', 16 + 'px')

  var arriveTimeText = ''
  if (delivery.arriveAt) {
    arriveTimeText = 'A ' + delivery.arriveAt.getHours() + ':' + ('0' + delivery.arriveAt.getMinutes()).slice(-2)
  }
  var detailDeliveryInfoArrivaltime = detailDeliveryInfoGroup.append('text')
    .attr('text-anchor', 'END')
    .attr('x', 344 - 5)
    .attr('y', 26)
    .text(arriveTimeText)
    .attr('class', 'detailInfoArrivaltime')
    .attr('font-size', 16 + 'px')

  // Delay information
  var detailDeliveryInfoDelay = detailDeliveryInfoGroup.append('text')
    .attr('text-anchor', 'END')
    .attr('x', 344 - 5)
    .attr('y', 46)
    .text(function () {
      if (delivery.delay > 15) {
        return 'Δ' + delivery.delay
      } else {
        return '+' + Math.abs(delivery.delay)
      }
    })
    .attr('class', function (d) {
      if (delivery.delay > 15) {
        return 'detailInfoDelay late'
      } else if (delivery.delay < -15) {
        return 'detailInfoDelay early'
      } else {
        return 'detailInfoDelay'
      }
    })
    .attr('font-size', 16 + 'px')

  // Positioning the delay text
  detailDeliveryDataGroup = detailSvg.append('g')
    .attr('class', 'detailDelivery')
    .attr('transform', 'translate(' + detailStartingX + ',' + detailDeliveryRectY + ')')

  // Setup Axis and the time label
  var detailDeliveryYAxisGroup = detailDeliveryDataGroup.append('g')
    .attr('class', 'y axis')
  detailDeliveryYAxisGroup.append('line')
    .attr('class', 'yAxis')
    .attr('x1', xScale(_now))
    .attr('y1', 30)
    .attr('x2', xScale(_now))
    .attr('y2', Math.max(_locationHeight + _X_AXIS_HEIGHT, outerHeight))
  detailDeliveryYAxisGroup.append('rect')
    .attr('x', xScale(_now) - (120 / 2))
    .attr('y', 14)
    .attr('width', 120)
    .attr('height', 16)
    .attr('class', 'yAxisDateTimeBox')
  detailDeliveryYAxisGroup.append('text')
    .attr('x', xScale(_now))
    .attr('y', 27)
    .attr('text-anchor', 'middle')
    .text(function (d, i) {
      return (nowMonth + 1) + '.' + nowDay + '.' + nowYear + ' // ' + nowHours + '.' + nowMinutes
    })
    .attr('class', 'yAxisDateTimeText')
    .attr('font-size', 14 + 'px')
  detailDeliveryYAxisGroup.append('svg:path')
    .attr('d', function (d) {
      return customShapes['dBook'](4)
    })
    .attr('class', 'yAxisDateTimeArrow')
    .attr('transform', function (d) {
      return 'translate(' + xScale(_now) + ',' + (30) + ')'
    })

  var detailDeliveryDataScheduledGroup = detailDeliveryDataGroup.append('g')
    .attr('class', 'detailScheduled')
    .attr('transform', 'translate(' + 0 + ',' + (detailPadding + eventHeight) + ')')

  // Lines
  detailDeliveryDataScheduledGroup
    .selectAll('.detailScheduledLine')
    .data(delivery.values)
    .enter()
    .append('g')
    .each(function (d) {
      var workflow = d3.select(this)
      var nonsearchEPT = d.nonSearchEPT
      var searchEPT = d.searchEPT
      var releaseEPT = d.releaseEPT
      var EPT = d.EPT
      var oneMinute = 1000 * 60

      if (utils.inSubstepLocation(d)) {
        workflow.append('line')
          .attr('x1', function (d, i) {
            return xScale(
              d.originalETA
            )
          })
          .attr('y1', 0)
          .attr('x2', function (d) {
            return xScale(
              d.originalETA.getTime() + nonsearchEPT * oneMinute - 60000
            )
          })
          .attr('y2', 0)
          .attr('class', function (d) {
            if (d.originalETA > _now) {
              return 'detailScheduledLine2 notReached'
            }
            return 'detailScheduledLine2'
          })

        workflow.append('line')
          .attr('x1', function (d, i) {
            return xScale(
              d.originalETA.getTime() + nonsearchEPT * oneMinute
            )
          })
          .attr('y1', 0)
          .attr('x2', function (d) {
            return xScale(
              d.originalETA.getTime() + nonsearchEPT * oneMinute + searchEPT * oneMinute - 60000
            )
          })
          .attr('y2', 0)
          .attr('class', function (d) {
            if (d.originalETA > _now) {
              return 'detailScheduledLine2 notReached'
            }
            return 'detailScheduledLine2'
          })

        workflow.append('line')
          .attr('x1', function (d, i) {
            return xScale(
              d.originalETA.getTime() + nonsearchEPT * oneMinute + searchEPT * oneMinute
            )
          })
          .attr('y1', 0)
          .attr('x2', function (d, i) {
            if (d.step < delivery.values.length) {
              var nextWorkflow = _.find(delivery.values, {step: d.step + 1})
              return xScale(nextWorkflow.originalETA.getTime() - 60000)
            } else {
              return xScale(
                d.originalETA.getTime() + nonsearchEPT * oneMinute + searchEPT * oneMinute + releaseEPT * oneMinute - 60000
              )
            }
          })
          .attr('y2', 0)
          .attr('class', function (d) {
            if (d.originalETA > _now) {
              return 'detailScheduledLine2 notReached'
            }
            return 'detailScheduledLine2'
          })

        workflow.append('svg:path')
          .attr('d', function (d) { return customShapes['lBook'](4);})
          .attr('transform', function (d) {
            return 'translate(' + xScale(d.originalETA) + ',' + 0 + ')'
          })
          .attr('fill', '#797F88')

        workflow.append('svg:path')
          .attr('d', function (d) { return customShapes['rBook'](4);})
          .attr('transform', function (d) {
            if (d.step < delivery.values.length) {
              var nextWorkflow = _.find(delivery.values, {step: d.step + 1})
              var endTime = nextWorkflow.originalETA.getTime() - 60000
            } else {
              var endTime = d.originalETA.getTime() + nonsearchEPT * oneMinute + searchEPT * oneMinute + releaseEPT * oneMinute - 60000
            }
            return 'translate(' + xScale(endTime) + ',' + 0 + ')'
          })
          .attr('fill', '#797F88')
      } else {
        workflow.append('line')
          .attr('x1', function (d, i) {
            return xScale(d.originalETA)
          })
          .attr('y1', 0)
          .attr('x2', function (d, i) {
            return xScale(
              d.originalETA.getTime() + EPT * 60000 - 60000
            )
          })
          .attr('y2', 0)
          .attr('class', function (d) {
            if (d.originalETA > _now) {
              return 'detailScheduledLine2 notReached'
            }
            return 'detailScheduledLine2'
          })

        workflow.append('svg:path')
          .attr('d', function (d) { return customShapes['lBook'](4);})
          .attr('transform', function (d) {
            return 'translate(' + xScale(d.originalETA) + ',' + 0 + ')'
          })
          .attr('fill', '#797F88')

        workflow.append('svg:path')
          .attr('d', function (d) { return customShapes['rBook'](4);})
          .attr('transform', function (d) {
            return 'translate(' + xScale(d.originalETA.getTime() + EPT * 60000 - 60000) + ',' + 0 + ')'
          })
          .attr('fill', '#797F88')
      }
    })

  // Labels
  detailDeliveryDataScheduledGroup
    .selectAll('.detailScheduledLabels')
    .data(delivery.values)
    .enter()
    .append('g')
    .each(function (d) {
      var workflow = d3.select(this)
      var nonsearchEPT = d.nonSearchEPT
      var searchEPT = d.searchEPT
      var releaseEPT = d.releaseEPT
      var EPT = d.EPT
      var oneMinute = 1000 * 60

      if (utils.inSubstepLocation(d)) {
        workflow.append('text')
          .attr('x', function (d) {
            return xScale(
              d.originalETA
            )
          })
          .attr('y', -3)
          .text(function (d, i) {
            var locationName = utils.getLocationNameFromWorkflow(d)
            return utils.getLocationAbbrFromLocationName(locationName) + '.1'
          })
          .attr('class', 'detailScheduledLabels')
          .attr('font-size', 14 + 'px')

        workflow.append('text')
          .attr('x', function (d) {
            return xScale(
              d.originalETA.getTime() + nonsearchEPT * 60000
            )
          })
          .attr('y', function (d) {
            var distance = xScale(d.originalETA.getTime() + nonsearchEPT * 60000) - xScale(d.originalETA)
            console.log('2222', distance)
            if (distance < 24) {
              return 13
            } else {
              return -3
            }
          })
          .text(function (d, i) {
            return 2
          })
          .attr('class', 'detailScheduledLabels')
          .attr('font-size', 14 + 'px')

        workflow.append('text')
          .attr('x', function (d) {
            return xScale(
              d.originalETA.getTime() + nonsearchEPT * 60000 + searchEPT * 60000
            )
          })
          .attr('y', function (d) {
            var distance2 = xScale(d.originalETA.getTime() + nonsearchEPT * 60000) - xScale(d.originalETA)
            if (distance2 >= 24) {
              var distance32 = xScale(d.originalETA.getTime() + nonsearchEPT * 60000 + searchEPT * 60000) - xScale(d.originalETA.getTime() + nonSearchEPT * 60000)
              if (distance32 > 10) {
                return -3
              } else {
                return 13
              }
            } else {
              var distance31 = xScale(d.originalETA.getTime() + nonsearchEPT * 60000 + searchEPT * 60000) - xScale(d.originalETA)
              if (distance31 >= 24) {
                return -3
              } else {
                return 13
              }
            }
          })
          .text(function (d, i) {
            return 3
          })
          .attr('class', 'detailScheduledLabels')
          .attr('font-size', 14 + 'px')
      } else {
        workflow.append('text')
          .attr('x', function (d) {
            return xScale(d.originalETA)
          })
          .attr('y', -3)
          .text(function (d) {
            if (d.step === 1 && !d['started-at']) {
              var locationName = 'En Route'
            } else {
              var locationName = utils.getLocationNameFromWorkflow(d)
            }

            return utils.getLocationAbbrFromLocationName(locationName)
          })
          .attr('class', 'detailScheduledLabels')
          .attr('font-size', 14 + 'px')
      }
    })

  var detailDeliveryDataActualGroup = detailDeliveryDataGroup.append('g')
    .attr('class', 'detailScheduled')
    .attr('transform', 'translate(' + 0 + ',' + (detailPadding + eventHeight + eventHeight) + ')')

  var prevData = {}
  detailDeliveryDataActualGroup
    .selectAll('.detailActualLine')
    .data(delivery.values)
    .enter()
    .append('g')
    .each(function (d, i) {
      if (utils.isDeliveryInLocation(delivery, 'En Route')) {
        return
      }

      var workflow = d3.select(this)
      workflow = appendWorkflow(workflow, d)
      if (d.step === 1 && d.eta < d['started-at']) {
        prependEtaLine(workflow, d)
      }
      if (i > 0 && d['started-at'] != null && prevData['ended-at'] != null) {
        appendLineBetweenPorts(workflow, d, prevData)
      }

      prevData = d
    })

  detailDeliveryDataActualGroup
    .selectAll('.detailActualLabels')
    .data(delivery.values)
    .enter()
    .append('g')
    .each(function (d) {
      var workflow = d3.select(this)

      var startedAt = d['started-at']
      var endedAt = d['ended-at']
      var searchEnd = d['search-end']
      var nonsearchEnd = d['nonsearch-end']

      var nonsearchEPT = d.nonSearchEPT
      var searchEPT = d.searchEPT
      var releaseEPT = d.releaseEPT
      var EPT = d.EPT

      if (startedAt & startedAt < _now) {
        var yPos = -3
        if (utils.inSubstepLocation(d)) {
          var substep1State = utils.calculateDelayState(startedAt, nonsearchEnd, nonsearchEPT)
          var substep2State = utils.calculateDelayState(nonsearchEnd, searchEnd, searchEPT)
          var substep3State = utils.calculateDelayState(searchEnd, endedAt, releaseEPT)

          workflow.append('text')
            .attr('x1', xScale(startedAt))
            .attr('y', yPos)
            .text(function (d, i) {
              var id = d.locationOrder[d.step - 1]
              return _.find(_DS.locations, {id: id}).abbr
            })
            .attr('class', function (d) {
              return 'detailActualLabels ' + substep1State
            })
            .attr('font-size', 14 + 'px')

          if (nonsearchEnd & nonsearchEnd < _now) {
            workflow.append('text')
              .attr('x', function (d) { return xScale(nonsearchEnd)})
              .attr('y', yPos)
              .text(2)
              .attr('class', function (d) {
                return 'detailActualLabels ' + substep2State
              })
              .attr('font-size', 14 + 'px')
          }

          if (searchEnd & searchEnd < _now) {
            workflow.append('text')
              .attr('x', function (d) { return xScale(searchEnd & searchEnd) })
              .attr('y', yPos)
              .text(3)
              .attr('class', function (d) {
                return 'detailActualLabels ' + substep3State
              })
              .attr('font-size', 14 + 'px')
          }
        } else {
          workflow.append('text')
            .attr('x', function (d) { return xScale(startedAt) })
            .attr('y', yPos)
            .text(function (workflow, i) {
              var locationName = utils.getLocationNameFromWorkflow(d)
              return _.find(_DS.LOCATION_META, {name: locationName}).abbr
            })
            .attr('class', function (d) {
              return 'detailActualLabels ' + d.states[0]
            })
            .attr('font-size', 14 + 'px')
        }
      }
    })

  detailDeliveryDataGroup.append('image')
    .attr('xlink:href', function (i) {
      return 'img/' + delivery.vehicleType + '.png'
    })
    .attr('height', vehicleShapeH)
    .attr('width', vehicleShapeH)
    .attr('x', -1 * (vehicleShapeH / 2))
    .attr('y', -1 * (vehicleShapeH / 2))
    .attr('class', 'truckIconDiamond')
    .attr('transform', function (d) {return 'translate(' + xScale(_now) + ',' + (detailPadding + eventHeight + eventHeight) + ')'})

  var deliveryEvents = _.filter(_DS.events, {deliveryId: delivery.key})
  var deliveryContacts = []

  var detailDeliveryDataEventsGroup = detailDeliveryDataGroup.append('g')
    .attr('class', 'detailScheduled')
    .attr('transform', 'translate(' + 0 + ',' + (detailPadding + eventHeight * 4) + ')')

  detailDeliveryDataEventsGroup
    .selectAll('.detailEventLine')
    .data(deliveryEvents)
    .enter()
    .append('line')
    .attr('x1', function (d) {
      return xScale(
        d.timestamp.getTime()
      )
    })
    .attr('y1', function (d) {
      return eventHeight * d.yIndex
    })
    .attr('x2', function (d, i) {
      if (!d.endTimestamp) {
        return xScale(_now)
      } else {
        return xScale(d.endTimestamp)
      }
    })
    .attr('y2', function (d) {
      return eventHeight * d.yIndex
    })
    .attr('class', function (d) {
      return 'detailEventLine'
    })
    .style('stroke-dasharray', ('1, 1'))

  detailDeliveryDataEventsGroup
    .selectAll('.detailEventStart')
    .data(deliveryEvents)
    .enter()
    .append('circle')
    .attr('cx', function (d) {return xScale(d.timestamp)})
    .attr('cy', function (d) {return eventHeight * d.yIndex})
    .attr('r', 3)
    .attr('class', 'detailEventStart')

  detailDeliveryDataEventsGroup
    .selectAll('.detailEventEnd')
    .data(deliveryEvents)
    .enter()
    .append('circle')
    .each(function (d) {
      var eventEnd = d3.select(this)
      if (d.endTimestamp !== null) {
        eventEnd
          .attr('cx', function (d) {return xScale(d.endTimestamp)})
          .attr('cy', function (d) {return eventHeight * d.yIndex})
          .attr('r', 3)
          .attr('class', 'detailEventEnd')
      }
    })

  var detailCommunicationLabelsGroup = detailSvg.append('g')
    .attr('transform', 'translate(' + stationTextPadding.left + ',' + (detailDeliveryRectY - 50 + detailPadding + eventHeight * 2 - 7) + ')')
    .attr('class', 'detailCommunicationLabelsGroup')

  detailCommunicationLabelsGroup
    .selectAll('.detailCommunicationDefaultLabel')
    .data(inspectionLabels)
    .enter()
    .append('text')
    .attr('x', stationTextPadding.left)
    .attr('y', function (d, i) { return eventHeight * (i + 1)})
    // .attr("y", function(d,i) { return (detailDeliveryRectY - 50) + (detailPadding + eventHeight*(i+1) + eventHeight*2 ) - 7})
    .text(function (d, i) {return d})
    .attr('class', 'detailCommunicationDefaultLabel name')
    .attr('font-size', 14 + 'px')

  detailCommunicationLabelsGroup
    .selectAll('.detailCommunicationLabel')
    .data(_POSTS)
    .enter()
    .append('text')
    .attr('x', function (d, i) { return stationTextPadding.left;})
    .attr('y', function (d, i) { return eventHeight * (i + 1) + eventHeight * 3})
    .text(function (d) {return d.fullName})
    .attr('class', 'detailCommunicationLabel name')
    .attr('font-size', 14 + 'px')
}

function calculateInfoboxCurrStation (delivery) {
  var currentWorkflow = utils.getCurrentWorkflow(delivery.values)
  var locationName = delivery.currentLocation.name

  if (locationName === 'En Route' || locationName === 'EXit') {
    return ''
  }

  if (utils.inSubstepLocation(currentWorkflow)) {
    var currentSubstep = utils.getCurrentSubstep(currentWorkflow)

    return '(' + locationName + ' ' + currentSubstep + '/3)'
  }

  return '(' + locationName + ')'
}

function dismissDeliveryDetail () {
  _DS.isDetailDisplayed = false
  d3.select('#detailSvg').style('opacity', 0.0).remove()
}
