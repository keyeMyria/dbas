/**
 * @author Teresa Uebber, Tobias Krauthoff
 * @email teresa.uebber@hhu.de, krauthoff@cs.uni-duesseldorf.de
 */

function DiscussionGraph(box_sizes_for_rescaling, is_partial_graph_mode) {
    'use strict';
    var s;
    var isPartialGraphMode = is_partial_graph_mode;
    var isVisible;
    var colors;
    var rescaleGraph;
    var box_sizes = box_sizes_for_rescaling; // needed for rescaling

    var force;
    var edges;
    var link;
    var circle;
    var rect;
    var label;

    var node;
    var statement_size = 6; // base node size of an statement
    var node_factor_size = 10; // additional size for the doj, which is in [0,1]
    var rel_node_factor;
    var currentColorOfCircle;
    var selectedCircleId;
    var node_size = 6;
    var issue_size = 8;
    var edge_size = 90;
    var edge_size_virtual_node = 10;
    var circleIds;

    /**
     * Displays a graph of current discussion
     */
    this.showGraph = function (override_cases) {
        initialDicts();
        var url = window.location.href.split('?')['0'];
        url = url.split('#')[0];
        var is_argument = null;
        var uid = null;
        var tmp = url.split('/');
        isPartialGraphMode = override_cases;
        if (!override_cases) {
	        if (url.indexOf('attitude') !== -1) {
		        uid = tmp[tmp.indexOf('attitude') + 1];
		        is_argument = false;
		        isPartialGraphMode = true;
	        } else if (url.indexOf('justify') !== -1) {
		        uid = tmp[tmp.indexOf('justify') + 1];
		        is_argument = false;
		        isPartialGraphMode = true;
	        } else if (url.indexOf('reaction') !== -1) {
		        uid = tmp[tmp.indexOf('reaction') + 1];
		        is_argument = true;
		        isPartialGraphMode = true;
	        } else if (url.indexOf('support') !== -1) {
		        uid = tmp[tmp.indexOf('support') + 1];
		        is_argument = true;
		        isPartialGraphMode = true;
	        }
        }
	    new AjaxGraphHandler().getDiscussionGraphData(this, uid, is_argument, isPartialGraphMode);
    };

    /**
     * Initialize global dictionaries.
     */
    function initialDicts(){
        setIsVisibleDict();
        setColorsDict();
        setRescaleGraphDict();
    }

    /**
     * Initialize dict "isVisible".
     */
    function setIsVisibleDict() {
        isVisible = {'position': false,
                     'content': false,
                     'statement': false,
                     'support': false,
                     'attack': false,
                     'defaultView': false};
    }

    /**
     * Initialize dict "colors".
     */
    function setColorsDict() {
        colors = {'light_grey': '#E0E0E0',
                  'grey': '#848484',
                  'yellow': '#FFC107',
                  'red': '#F44336',
                  'green': '#64DD17',
                  'blue': '#3D5AFE',
                  'black': '#000000',
                  'dark_grey': '#424242'};
    }

    /**
     * Initialize dict "rescaleGraph".
     */
    function setRescaleGraphDict() {
        rescaleGraph = {
            'font_size': 14, // needed for rescaling
            'line_height': 1.5, // needed for rescaling
            'node_id_prefix': 'node_', // needed for rescaling
            'old_scale': 1.0, // needed for rescaling
            'zoom_scale': 0
        };
    }

    /**
     * Callback if ajax request was successful.
     *
     * @param data
     * @param request_for_complete
     */
    this.callbackIfDoneForDiscussionGraph = function (data, request_for_complete) {
        var jsonData = $.parseJSON(data);
        if (jsonData.error.length !== 0){
        	setGlobalErrorHandler('Ohh!', jsonData.error);
        	new GuiHandler().setDisplayStyleAsDiscussion();
        	return;
        }
        s = new DiscussionGraph(box_sizes, isPartialGraphMode).setDefaultViewParams(true, jsonData, null, request_for_complete);
    };

    /**
     * If ajax request was successful show modal with data for jump into discussion.
     *
     * @param data
     */
    this.callbackIfDoneForGetJumpDataForGraph = function (data) {
        var jsonData = $.parseJSON(data);
        var popup = $('#popup-jump-graph');
        if (jsonData.error.length === 0) {
            var list = $('<ul>');
            popup.find('div.modal-body div').empty();
            createContentOfModalBody(jsonData, list);
            popup.find('div.modal-body div').append(list);

            // jump to url
            popup.find('input').click(function () {
                window.location = $(this).attr('value');
            });
        } else {
            popup.modal('hide');
        }

        // add hover effects
        new GuiHandler().hoverInputListOf(popup.find('div.modal-body div'));
    };

    /**
     * Create content for modal to jump into discussion.
     *
     * @param jsonData
     * @param list
     */
    function createContentOfModalBody(jsonData, list) {
        var label, input, element, counter = 0;

        $.each(jsonData.arguments, function (key, value) {
            input = $('<input>').attr('type', 'radio').attr('value', value.url).attr('id', 'jump_' + counter);
            label = $('<label>').html(value.text).attr('for', 'jump_' + counter);
            element = $('<li>').append(input).append(label);
            list.append(element);
            counter += 1;
        });
    }

    /**
     * Set parameters for default view of graph.
     *
     * @param startD3
     * @param jsonData
     * @param d3
     * @param request_for_complete
     */
    this.setDefaultViewParams = function (startD3, jsonData, d3, request_for_complete) {
    	var dg = new DiscussionGraph(box_sizes, isPartialGraphMode);
	    $('#global-view').attr('data-global-view-loaded', jsonData.type === 'complete');
        dg.setButtonDefaultSettings(jsonData, request_for_complete);
        initialDicts();
        var container = $('#' + graphViewContainerSpaceId);
        container.empty();

        if (startD3) {
            if (!this.getD3Graph(jsonData)){
                dg.setDefaultViewParams(false, null, d3, request_for_complete);}
        } else {
            container.empty();
        }
    };

    /**
     * Set default settings of buttons in sidebar.
     *
     * @param jsonData
     * @param request_for_complete
     */
    this.setButtonDefaultSettings = function (jsonData, request_for_complete) {
    	$('#graph-view-container').find('.sidebar').find('li').each(function(){
    		$(this).removeClass('hidden');
	    });
    	
        $('#show-labels').show();
        $('#hide-labels').hide();
        $('#show-my-statements').show();
        $('#hide-my-statements').hide();
        $('#show-attacks-on-my-statements').show();
        $('#hide-attacks-on-my-statements').hide();
        $('#show-supports-on-my-statements').show();
        $('#hide-supports-on-my-statements').hide();
        $('#show-positions').show();
        $('#hide-positions').hide();

        if ((request_for_complete || typeof request_for_complete === 'undefined') && !isPartialGraphMode){
        	$('#global-view').hide();
        } else {
        	$('#global-view').show();
        }
        
        // show or hide my path
	    $('#hide-my-path').hide();
        if (jsonData.path.length === 0) {
            $('#show-my-path').addClass('hidden');
        } else {
            $('#show-my-path').show();
        }
    };

    /**
     * Create a graph.
     *
     * @param jsonData
     */
    this.getD3Graph = function (jsonData) {
        var container = $('#' + graphViewContainerSpaceId);
        container.empty();
        rel_node_factor = {};
        //rel_node_factor = 'node_doj_factors' in jsonData ? jsonData.node_doj_factors : {};
        //rel_node_factor = 'node_opinion_factors' in jsonData? jsonData.node_opinion_factors : {};

        // height of the header (offset per line count)
        var offset = ($('#' + graphViewContainerHeaderId).outerHeight() / 26 - 1 ) * 26;

        var width = container.width();
        var height = container.outerHeight() - offset;

        var svg = getGraphSvg(width, height);
        force = getForce(width, height);

        // zoom and pan
        var zoom = d3.behavior.zoom();
        zoomAndPan(zoom);
        var drag = enableDrag();

        // resize
        resizeGraph(container);

        setEdges(jsonData, svg);

        // node
        node = createNodes(svg, drag);
        circle = setNodeProperties().attr('class', 'circle');

        setTooltip();

        setLegend();

        // buttons of sidebar
        addListenersForSidebarButtons(jsonData, zoom);
        // add listener to show/hide tooltip on mouse over
        addListenerForTooltip();

        force.start();

        // highlight nodes and edges
        addListenerForNodes();

        return true;
    };

    /**
     * Set edges of graph.
     *
     * @param jsonData
     * @param svg
     */
    function setEdges(jsonData, svg){
        // edge
        edges = createEdgeDict(jsonData);
        setNodeColorsForData(jsonData);
        setPositionOfGraphElements(jsonData);
        var edgesTypeArrow = createArrowDict();
        var marker = createArrows(svg, edgesTypeArrow);
        link = createLinks(svg, marker);
    }

    /**
     * Set tooltip.
     */
    function setTooltip(){
        // tooltip
        // rect as background of label
        var tooltip = node.append('g');
        rect = tooltip.append('rect').attr('class', 'labelBox');
        label = createLabel(tooltip);

        // reorder the elements so that the tooltips appear in front of the nodes
        tooltip.order();
        setRectProperties();
    }

    /**
     * Set legend.
     */
    function setLegend() {
        var container = $('#' + graphViewContainerSpaceId);

        // legend
        createLegend();
        // call updated legend
        var legend = d3.svg.legend();
        // create div for legend
        container.append("<div id = 'graphViewLegendId'></div>");
        getLegendSvg().call(legend);

    }

    /**
     * Set position of graph elements.
     *
     * @param jsonData
     */
    function setPositionOfGraphElements(jsonData){
        // create arrays of links, nodes and move layout forward one step
        force.links(edges).nodes(jsonData.nodes).on("tick", forceTick);
        // update force layout calculations
        function forceTick() {
            var position;

            // update position of nodes
            circle.attr({
                cx: function (d) {
                    if((d.label === "") && (d.edge_source.length === 1)) {
                        var edge_source = jsonData.nodes.filter(function (node) { return node.id === d.edge_source[0];})[0];
                        var edge_target = jsonData.nodes.filter(function (node) { return node.id === d.edge_target;})[0];
                        position = (edge_source.x + edge_target.x) / 2;
                    }
                    else {
                        position = d.x;
                    }
                    return position;
                },
                cy: function (d) {
                    if((d.label === "") && (d.edge_source.length === 1)) {
                        var edge_source = jsonData.nodes.filter(function (node) { return node.id === d.edge_source[0];})[0];
                        var edge_target = jsonData.nodes.filter(function (node) { return node.id === d.edge_target;})[0];
                        position = (edge_source.y + edge_target.y) / 2;
                    }
                    else {
                        position = d.y;
                    }
                    return position;
                }
            });

            // update position of edges
            link.attr({
                x1: function (d) {
                    return d3.select('#circle-' + d.source.id).attr('cx');
                },
                y1: function (d) {
                    return d3.select('#circle-' + d.source.id).attr('cy');
                },
                x2: function (d) {
                    return d3.select('#circle-' + d.target.id).attr('cx');
                },
                y2: function (d) {
                    return d3.select('#circle-' + d.target.id).attr('cy');
                }
            });

            // update position of rect
            rect.attr("transform", function (d) {
                return "translate(" + d.x + "," + (d.y - 50) + ")";
            });

            // update position of label
            label.attr("transform", function (d) {
                return "translate(" + d.x + "," + (d.y - 50) + ")";
            });
        }

    }

    /**
     * Create svg-element.
     *
     * @param width: width of container, which contains graph
     * @param height: height of container
     * @return scalable vector graphic
     */
    function getGraphSvg(width, height) {
        return d3.select('#' + graphViewContainerSpaceId).append("svg")
            .attr({width: width, height: height, id: "graph-svg"})
            .append('g')
            .attr("class", "zoom");
    }

    /**
     * Create force-directed network diagram and define properties.
     *
     * @param width: width of container, which contains graph
     * @param height: height of container
     * @return force layout
     */
    function getForce(width, height) {
        var factor = 800;
        return d3.layout.force()
            .size([width, height])
            // nodes push each other away
            .charge(-factor)
            .linkDistance(function (d) {
                if((d.source.label === '') || ((d.target.label === '') && (d.edge_type === ''))){
                    return edge_size_virtual_node;
                }
                return edge_size;
            });
    }

    /**
     * Enable zoom and pan functionality on graph.
     */
    function zoomAndPan(zoom) {
        zoom.on("zoom", redraw).scaleExtent([0.5, 5]);

        d3.select("#graph-svg").call(zoom).on("dblclick.zoom", null);

        // if default view button is clicked redraw graph once
        if(isVisible.defaultView){
            redraw();
        }

        function redraw() {
            var change_scale = true;
            if(isVisible.defaultView){
                rescaleGraph.zoom_scale = 1;
                isVisible.defaultView = false;
            }
            else{
                rescaleGraph.zoom_scale = zoom.scale();
                change_scale = Math.abs(rescaleGraph.old_scale - rescaleGraph.zoom_scale) > 0.02;
            }

            rescaleGraph.old_scale = rescaleGraph.zoom_scale;

            d3.selectAll("g.zoom").attr("transform", "translate(" + zoom.translate() + ")" + " scale(" + rescaleGraph.zoom_scale + ")");

            if (change_scale) {
                // resizing of font size, line height and the complete rectangle
                $('#graph-svg').find('.node').each(function () {
                    var id = $(this).attr('id').replace(rescaleGraph.node_id_prefix, '');
                    if (id.indexOf('statement') !== -1 || id.indexOf('issue') !== -1) {
                        $('#label-' + id).css({
                            'font-size': rescaleGraph.font_size / rescaleGraph.zoom_scale + 'px',
                            'line-height': rescaleGraph.line_height / rescaleGraph.zoom_scale
                        });
                        var width = box_sizes[id].width / rescaleGraph.zoom_scale;
                        var height = box_sizes[id].height / rescaleGraph.zoom_scale;
                        var pos = calculateRectPos(box_sizes[id].width, box_sizes[id].height);
                        $('#rect-' + id).attr({
                            'width': width,
                            'height': height,
                            'x': pos[0] / rescaleGraph.zoom_scale,
                            'y': pos[1] / rescaleGraph.zoom_scale
                        });
                    }
                });

                // dirty hack to accept new line height and label position
                $('#graph-svg').css({'line-height': '1.0'});
                setTimeout(function () {
                    $('#graph-svg').css({'line-height': '1.5'});
                    $('#' + graphViewContainerSpaceId).find('.node').each(function () {
                        var id = $(this).attr('id').replace(rescaleGraph.node_id_prefix, '');
                        var label = $('#label-' + id);
                        var rect = $('#rect-' + id);
                        label.attr({
                            'y': -label.height() / rescaleGraph.zoom_scale + 45 / rescaleGraph.zoom_scale
                        });
                    });
                }, 300);
            }
        }
    }

    /**
     * Enable drag functionality, because pan functionality overrides drag.
     *
     * @return drag functionality
     */
    function enableDrag() {
        return force.drag()
            .on("dragstart", function () {
                d3.event.sourceEvent.stopPropagation();
            });
    }

    /**
     * Resize graph on window event.
     *
     * @param container
     */
    function resizeGraph(container) {
        d3.select(window).on("resize", resize);
        function resize() {
            var graphSvg = $('#graph-svg');
            graphSvg.width(container.width());
            // height of space between header and bottom of container
            graphSvg.height(container.outerHeight() - $('#graph-view-container-header').height() + 20);
            force.size([container.width(), container.outerHeight()]).resume();
        }
    }

    /**
     * Sets the color in the json Data
     *
     * @jsonData
     */
    function setNodeColorsForData(jsonData) {
        jsonData.nodes.forEach(function (e) {
            if (e.type === 'position') {
                e.color = colors.blue;
            }
            else if (e.type === 'statement') {
                e.color = colors.yellow;
            }
            else if (e.type === 'issue') {
                e.color = colors.grey;
            }
            else {
                e.color = colors.black;
            }
        });
    }

    /**
     * Create dictionary for edges.
     *
     * @param jsonData: dict with data for nodes and edges
     * @return Array array, which contains dicts for edges
     */
    function createEdgeDict(jsonData) {
        var edges = [];
        jsonData.edges.forEach(function (e) {
            // get source and target nodes
            var sourceNode = jsonData.nodes.filter(function (d) {
                    return d.id === e.source;
                })[0],
                targetNode = jsonData.nodes.filter(function (d) {
                    return d.id === e.target;
                })[0];
            // add edge, color, type, size and id to array
            edges.push({
                source: sourceNode,
                target: targetNode,
                color: e.color,
                edge_type: e.edge_type,
                id: e.id
            });
        });
        return edges;
    }

    /**
     * Select edges with type of arrow.
     *
     * @return Array array, which contains edges of type arrow
     */
    function createArrowDict() {
        var edgesTypeArrow = [];
        edges.forEach(function (d) {
            if (d.edge_type === 'arrow') {
                return edgesTypeArrow.push(d);
            }
        });
        return edgesTypeArrow;
    }

    /**
     * Create arrows for edges.
     *
     * @param svg
     * @param edgesTypeArrow
     * @return marker: arrow
     */
    function createArrows(svg, edgesTypeArrow) {
        return svg.append("defs").selectAll('marker').data(edgesTypeArrow)
            .enter().append("svg:marker")
            .attr({
                id: function (d) {
                    return "marker_" + d.edge_type + d.id;
                },
                // for doj
                refX: function (d) {
                    if(d.is_undercut === true){
                        return 6;
                    }
                    return 6 + calculateNodeSize(d.target) / 2;
                },
                refY: 0,
                markerWidth: 10, markerHeight: 10,
                viewBox: '0 -5 10 10',
                orient: "auto",
                fill: function (d) {
                    return d.color;
                }
            })
            .append("svg:path")
            .attr("d", "M0,-3L7,0L0,3");
    }

    /**
     * Create links between nodes.
     *
     * @param svg
     * @param marker: arrow
     * @return links
     */
    function createLinks(svg, marker) {
        return svg.selectAll(".path")
            .data(edges)
            // svg lines
            .enter().append("line")
            .attr({
                'class': "link",
                'id': function (d) { return 'link-' + d.id; }
            })
            .style("stroke", function (d) {
                return d.color;
            })
            // assign marker to line
            .attr("marker-end", function (d) {
                return "url(#marker_" + d.edge_type + d.id + ")";
            });
    }

    /**
     * Create node as svg circle and enable drag functionality.
     *
     * @param svg
     * @param drag
     * @return nodes
     */
    function createNodes(svg, drag) {
        return svg.selectAll(".node")
            .data(force.nodes())
            .enter().append("g")
            .attr({
                'class': "node",
                'id': function (d) {
                    return rescaleGraph.node_id_prefix + d.id;
                }
            })
            .call(drag);
    }

    /**
     * Define properties for nodes.
     *
     * @return circle
     */
    function setNodeProperties() {
        return node.append("circle")
            .attr({
                'r': function (d) {
                    return calculateNodeSize(d);
                },
                'fill': function (d) {
                    return d.color;
                },
                'id': function (d) {
                    return 'circle-' + d.id;
                }
            });
    }

    /**
     * Calculates the node size in respect to the DOJ
     *
     * @param node
     * @returns {*}
     */
    function calculateNodeSize(node) {
        if (node.id.indexOf('statement_') !== -1) {
            var id = node.id.replace('statement_', '');
            if (id in rel_node_factor) {
                return node_size + node_factor_size * rel_node_factor[id];
            }
            else {
                return node_size;
            }
        }
        if (node.id.indexOf('argument_') !== -1) {
            return 0;
        }
        return issue_size;
    }

    /**
     * Wrap text.
     *
     * @param node
     * @return label
     */
    function createLabel(node) {
        return node.append("text").each(function (d) {
        	var text = $("<div>").html(d.label).text();
            var node_text = text.split(" ");
            for (var i = 0; i < node_text.length; i++) {
                if ((i % 4) === 0) {
                    d3.select(this).append("tspan")
                        .text(node_text[i])
                        .attr({
                            'dy': i ? '1.2em' : '0',
                            'x': '0',
                            'text-anchor': "middle"
                        });
                }
                else {
                    d3.select(this).append("tspan").text(' ' + node_text[i]);
                }
            }
            d3.select(this).attr("id", 'label-' + d.id);
            // set position of label
            var height = $("#label-" + d.id).height();
            d3.select(this).attr("y", -height + 45);
        });
    }

    /**
     * Set properties for rect.
     */
    function setRectProperties() {
        rect.each(function (d) {
            var element = $("#label-" + d.id);
            var width = element.width() + 24;
            var height = element.height() + 10;
            var pos = calculateRectPos(width, height);
            // if d is a virtual node do not show label
            if (d.label === '') {
                width = 0;
                height = 0;
            }
            d3.select(this).attr({
                'width': width,
                'height': height,
                'x': pos[0],
                'y': pos[1],
                'id': 'rect-' + d.id
            });
            if (d.id.indexOf('statement') !== -1 || d.id.indexOf('issue') !== -1) {
                box_sizes[d.id] = {'width': width, 'height': height};
            }
        });
    }

    /**
     * Calculate the rectangle position depending on the rectangle width and height
     *
     * @param width int
     * @param height int
     * @returns {*[]} [x, y]
     */
    function calculateRectPos(width, height) {
        return [-width / 2, -height + 36];
    }

    /**
     * Create svg for legend.
     */
    function getLegendSvg() {
        d3.select('#graphViewLegendId').append("svg")
            .attr({
                'width': 200,
                'height': 200,
                'id': "graph-legend-svg"
            });
        return d3.select("#graph-legend-svg").append("g")
            .attr({
                'id': "graphLegend",
                'transform': "translate(10,20)"
            });
    }

    /**
     * Listen whether a node is clicked.
     */
    function addListenerForNodes() {
        circle.on("click", function (d) {
            // distinguish between click and drag event
            if (d3.event.defaultPrevented) {
                return;
            }
            var circleId = this.id;
            showPartOfGraph(circleId);
            selectedCircleId = d.id;
        });
        circle.on("dblclick", function (d) {
            // distinguish between click and drag event
            if (d3.event.defaultPrevented) {
                return;
            }
            // show modal when node clicked twice
            showModal(d);
            var circleId = this.id;
            showPartOfGraph(circleId);
            selectedCircleId = d.id;
        });
    }

    /**
     * Create legend and update legend.
     */
    function createLegend() {
        // labels and colors for legend
        var legendLabelCircle = [_t_discussion("issue"), _t_discussion("position"), _t_discussion("statement")],
            legendLabelRect = [_t_discussion("support"), _t_discussion("attack")],
            legendColorCircle = [colors.grey, colors.blue, colors.yellow],
            legendColorRect = [colors.green, colors.red];

        // set properties for legend
        d3.svg.legend = function () {
            function legend(selection) {
                createNodeSymbols(selection, legendLabelCircle, legendColorCircle);
                createEdgeSymbols(selection, legendLabelRect, legendColorRect);
                createLabelsForSymbols(selection, legendLabelCircle, legendLabelRect);
            }

            return legend;
        };
    }

    /**
     * Create symbols for nodes.
     *
     * @param selection
     * @param legendLabelCircle: array with labels for circle
     * @param legendColorCircle: array with colors
     */
    function createNodeSymbols(selection, legendLabelCircle, legendColorCircle) {
        selection.selectAll(".circle")
            .data(legendLabelCircle)
            .enter().append("circle")
            .attr({
                fill: function (d, i) {
                    return legendColorCircle[i];
                },
                r: statement_size,
                cy: function (d, i) {
                    return i * 40;
                }
            });
    }

    /**
     * Create symbols for edges.
     *
     * @param selection
     * @param legendLabelRect: array with labels for rect
     * @param legendColorRect: array with colors
     */
    function createEdgeSymbols(selection, legendLabelRect, legendColorRect) {
        selection.selectAll(".rect")
            .data(legendLabelRect)
            .enter().append("rect")
            .attr({
                fill: function (d, i) {
                    return legendColorRect[i];
                },
                width: 15,
                height: 5,
                x: -7, y: function (d, i) {
                    return i * 40 + 118;
                }
            });
    }

    /**
     * Create labels for symbols.
     *
     * @param selection
     * @param legendLabelCircle: array with labels for circle
     * @param legendLabelRect: array with labels for rect
     */
    function createLabelsForSymbols(selection, legendLabelCircle, legendLabelRect) {
        selection.selectAll(".text")
            .data(legendLabelCircle.concat(legendLabelRect))
            .enter().append("text")
            .text(function (d) {
                return d;
            })
            .attr({
                x: 20, y: function (d, i) {
                    return i * 40 + 5;
                }
            });
    }

    /**
     * Add listeners for buttons of sidebar.
     *
     * @param jsonData
     * @param zoom
     */
    function addListenersForSidebarButtons(jsonData, zoom) {
        $('#default-view').off('click').click(function () {
        	if ($('#global-view').attr('data-global-view-loaded') === 'true' && $('#global-view:hidden').length === 0) {
	            new DiscussionGraph(box_sizes, isPartialGraphMode).showGraph(false);}
	        else {
	            showDefaultView(jsonData, zoom);}
        });
        $('#global-view').off('click').click(function () {
        	if ($(this).attr('data-global-view-loaded') === 'true') {
        		showDefaultView(jsonData, zoom);}
	        else {
                new DiscussionGraph(box_sizes, isPartialGraphMode).showGraph(true);}
        });
        $('#show-labels').off('click').click(function () {
            showLabels();
        });
        $('#hide-labels').off('click').click(function () {
            hideLabels();
        });
        $('#show-positions').off('click').click(function () {
            showPositions();
        });
        $('#hide-positions').off('click').click(function () {
            hidePositions();
        });
        $('#show-my-path').off('click').click(function () {
            showPath(jsonData);
        });
        $('#hide-my-path').off('click').click(function () {
            hidePath();
        });
        $('#show-my-statements').off('click').click(function () {
            showMyStatements();
        });
        $('#hide-my-statements').off('click').click(function () {
            hideMyStatements();
        });
        $('#show-supports-on-my-statements').off('click').click(function () {
            showSupportsOnMyStatements();
        });
        $('#hide-supports-on-my-statements').off('click').click(function () {
            hideSupportsOnMyStatements();
        });
        $('#show-attacks-on-my-statements').off('click').click(function () {
            showAttacksOnMyStatements();
        });
        $('#hide-attacks-on-my-statements').off('click').click(function () {
            hideAttacksOnMyStatements();
        });
    }
	
    /**
     * Restore initial state of graph.
     *
     * @param jsonData
     * @param zoom
     */
    function showDefaultView(jsonData, zoom) {
        isVisible.defaultView = true;

        // reset buttons
        new DiscussionGraph(box_sizes, isPartialGraphMode).setButtonDefaultSettings(jsonData);

        // set position of graph and set scale
        d3.selectAll("g.zoom").attr("transform", "translate(" + 0 + ")" + " scale(" + 1 + ")");

        // stop zoom event
        zoom.on("zoom", null);

        // create new zoom event listener
        var zoomDefaultView = d3.behavior.zoom();
        zoomAndPan(zoomDefaultView);

        resetButtons();
    }

    /**
     * Reset graph if button default view is clicked.
     */
    function resetButtons() {
        isVisible.position = true;
        isVisible.content = true;
        isVisible.statement = true;
        isVisible.support = true;
        isVisible.attack = true;

        hideLabels();
        hidePositions();
        hidePath();
        hideMyStatements();
        hideSupportsOnMyStatements();
        hideAttacksOnMyStatements();
    }

    /**
     * Show all labels of graph.
     */
    function showLabels() {
        isVisible.content = true;
        isVisible.position = true;

        label.style("display", 'inline');
        rect.style("display", 'inline');

        hideLabelsOfNotSelectedNodes();

        $('#show-labels').hide();
        $('#hide-labels').show();
        // also show content of positions
        $('#show-positions').hide();
        $('#hide-positions').show();
    }

    /**
     * Hide labels of not selected nodes
     */
    function hideLabelsOfNotSelectedNodes() {
        // hide labels of nodes which are not selected
        d3.selectAll(".node").each(function (d) {
            if (d3.select('#circle-' + d.id).attr('fill') === colors.light_grey) {
                d3.select('#label-' + d.id).style("display", 'none');
                d3.select("#rect-" + d.id).style("display", 'none');
            }
        });
    }

    /**
     * Hide all labels of graph.
     */
    function hideLabels() {
        isVisible.content = false;
        label.style("display", 'none');
        rect.style("display", 'none');
        $('#show-labels').show();
        $('#hide-labels').hide();
        addListenerForTooltip();
        if (isVisible.position) {
            $('#show-positions').show();
            $('#hide-positions').hide();
        }
        isVisible.position = false;
    }

    /**
     * Show labels for positions.
     */
    function showPositions() {
        isVisible.position = true;
        // select positions
        setDisplayStyleOfNodes('inline');
        $('#show-positions').hide();
        $('#hide-positions').show();
    }

    /**
     * Hide labels for positions.
     */
    function hidePositions() {
        isVisible.position = false;
        addListenerForTooltip();
        // select positions
        setDisplayStyleOfNodes('none');
        $('#show-positions').show();
        $('#hide-positions').hide();
    }

    /**
     * Show current path.
     *
     * @param jsonData
     */
    function showPath(jsonData) {
        $('#show-my-path').hide();
        $('#hide-my-path').show();

        edges.forEach(function (d) {
            grayingElements(d);
        });

        if(jsonData.path.length !== 0) { // if jsonData.path is not empty highlight path
            highlightPath(jsonData);
        } else{ // if jsonData.path is empty color issue
            d3.select('#circle-issue').attr('fill', colors.grey);
        }
    }

    /**
     * Highlight path.
     *
     * @param jsonData
     */
    function highlightPath(jsonData) {
        var edgesCircleId = [];

        // run through all values in jsonData.path
        jsonData.path.forEach(function (d) {
            edges.forEach(function (edge) {
                // edge without virtual node
                if((edge.source.id === getId(d[0])) && (edge.target.id === getId(d[1]))) {
                    edgesCircleId.push(edge);
                }
                // edge with virtual node
                else if(edge.source.id === getId(d[0]) && edge.target.label === ''){
                    findEdgesVirtualNode(edge, edgesCircleId, d);
                }
            });
        });

        // highlight path
        edgesCircleId.forEach(function (d) {
            highlightElements(d);
        });
    }

    /**
     * Find two edges which connect source and target.
     *
     * @param edge
     * @param edgesCircleId
     */
    function findEdgesVirtualNode(edge, edgesCircleId, d){
        // edge from virtual node to statement
        edges.forEach(function (e) {
            if (e.source.id === edge.target.id && e.target.id === getId(d[1])) {
                edgesCircleId.push(edge);
                edgesCircleId.push(e);
            }
        });
    }

    /**
     * Get id of node.
     *
     * @param node
     * @returns {*}
     */
    function getId(node) {
        if(node === "issue"){
            return node;
        }
        return "statement_" + node;
    }

    /**
     * Hide current path.
     */
    function hidePath() {
        $('#show-my-path').show();
        $('#hide-my-path').hide();
        edges.forEach(function (d) {
            highlightElements(d);
        });
    }

    /**
     * Show all statements, which the current user has created.
     */
    function showMyStatements() {
        isVisible.statement = true;

        // hide supports and attacks on statements
        if (isVisible.support) {
            $('#show-supports-on-my-statements').show();
            $('#hide-supports-on-my-statements').hide();
            isVisible.support = false;
        }
        if (isVisible.attack) {
            $('#show-attacks-on-my-statements').show();
            $('#hide-attacks-on-my-statements').hide();
            isVisible.attack = false;
        }

        // graying all elements of graph
        edges.forEach(function (d) {
            grayingElements(d);
        });

        force.nodes().forEach(function (d) {
            if (d.author.name === $('#header_nickname')[0].innerText) {
                d3.select('#circle-' + d.id).attr({fill: d.color, stroke: 'black'});
            }
        });

        $('#show-my-statements').hide();
        $('#hide-my-statements').show();
    }

    /**
     * Hide all statements, which the current user has created.
     */
    function hideMyStatements() {
        isVisible.statement = false;

        // hide supports and attacks on statements
        if (isVisible.support) {
            $('#show-supports-on-my-statements').show();
            $('#hide-supports-on-my-statements').hide();
            isVisible.support = false;
        }
        if (isVisible.attack) {
            $('#show-attacks-on-my-statements').show();
            $('#hide-attacks-on-my-statements').hide();
            isVisible.attack = false;
        }

        highlightAllElements();

        // delete border of nodes
        deleteBorderOfCircle();

        $('#show-my-statements').show();
        $('#hide-my-statements').hide();
    }

    /**
     * Show all supports on the statements, which the current user has created.
     */
    function showSupportsOnMyStatements() {
        isVisible.support = true;

        // hide statements
        // delete border of nodes
        deleteBorderOfCircle();
        $('#show-my-statements').show();
        $('#hide-my-statements').hide();
        isVisible.statement = false;

        // if attacks on statements of current user are visible, highlight additionally the supports
        if (!isVisible.attack) {
            // graying all elements of graph
            edges.forEach(function (d) {
                grayingElements(d);
            });
        }

        selectSupportsAttacks();

        $('#show-supports-on-my-statements').hide();
        $('#hide-supports-on-my-statements').show();
    }

    /**
     * Hide all supports on the statements, which the current user has created.
     */
    function hideSupportsOnMyStatements() {
        isVisible.support = false;

        deleteBorderOfCircle();

        // if attacks are not visible, show the default view of the graph
        // else make them visible
        if (!isVisible.attack) {
            highlightAllElements();
        }
        else {
            showAttacksOnMyStatements();
        }

        $('#show-supports-on-my-statements').show();
        $('#hide-supports-on-my-statements').hide();
    }

    /**
     * Show all attacks on the statements, which the current user has created.
     */
    function showAttacksOnMyStatements() {
        isVisible.attack = true;

        // hide statements
        // delete border of nodes
        deleteBorderOfCircle();
        $('#show-my-statements').show();
        $('#hide-my-statements').hide();
        isVisible.statement = false;

        // if supports on statements of current user are visible, highlight additionally the attacks
        if (!isVisible.support) {
            // graying all elements of graph
            edges.forEach(function (d) {
                grayingElements(d);
            });
        }

        selectSupportsAttacks();

        $('#show-attacks-on-my-statements').hide();
        $('#hide-attacks-on-my-statements').show();
    }

    /**
     * Hide all attacks on the statements, which the current user has created.
     */
    function hideAttacksOnMyStatements() {
        isVisible.attack = false;

        deleteBorderOfCircle();

        if (!isVisible.support) {
            highlightAllElements();
        }
        else {
            showSupportsOnMyStatements();
        }
        $('#show-attacks-on-my-statements').show();
        $('#hide-attacks-on-my-statements').hide();
    }

    /**
     * Select supports or attacks on statements of current user.
     */
    function selectSupportsAttacks(){
        circleIds = [];

        force.nodes().forEach(function (d) {
            if (d.author.name === $('#header_nickname')[0].innerText) {
                circleIds.push(d.id);
            }
        });

        force.nodes().forEach(function (d) {
            if (d.author.name === $('#header_nickname')[0].innerText) {
                showPartOfGraph(d.id);
            }
        });
    }

    /**
     * Highlight all elements of graph.
     */
    function highlightAllElements() {
        edges.forEach(function (d) {
            highlightElements(d);
        });
    }

    /**
     * Delete border of circle.
     */
    function deleteBorderOfCircle(){
        // delete border of nodes
        force.nodes().forEach(function (d) {
            d3.select('#circle-' + d.id).attr('stroke', 'none');
        });
    }

    /**
     * Set display style of nodes.
     *
     * @param style
     */
    function setDisplayStyleOfNodes(style) {
        // select edges with position as source and issue as target
        d3.selectAll(".node").each(function (d) {
            d3.selectAll(".link").each(function (e) {
                // only show labels of highlighted nodes
                if (e.source.id === d.id && e.target.id === 'issue' && d3.select('#circle-' + d.id).attr('fill') !== colors.light_grey) {
                    // set display style of positions
                    d3.select('#label-' + d.id).style("display", style);
                    d3.select("#rect-" + d.id).style("display", style);
                }
            });
        });
    }

    /**
     * Show/hide tooltips on mouse event.
     */
    function addListenerForTooltip() {
        d3.selectAll('.node').on("mouseover", function (d) {
            determineShowOrHideTooltip(d, true);
        }).on("mouseout", function (d) {
            determineShowOrHideTooltip(d, false);
        });
    }

    /**
     * Show or hide tooltip of node dependent on selected side-bar buttons.
     *
     * @param d: current node
     * @param mouseover
     */
    function determineShowOrHideTooltip(d, mouseover) {
        var isPosition = testNodePosition(d);
        if(!isVisible.position && !isVisible.content){
            showHideTooltip(d, mouseover);
        }
        else if(!isPosition && isVisible.position){
            showHideTooltip(d, mouseover);
        }
        else if(isPosition && isVisible.content){
            showHideTooltip(d, mouseover);
        }
    }

    /**
     * Test whether the selected node is a position.
     *
     * @param d
     */
    function testNodePosition(d){
        var isPosition = false;
        d3.selectAll(".link").each(function (e) {
            if (e.source.id === d.id && e.target.id === 'issue') {
                isPosition = true;
            }
        });
        return isPosition;
    }

    /**
     * Show or hide tooltip of node dependent on mouse event.
     *
     * @param d
     * @param mouseover
     */
    function showHideTooltip(d, mouseover) {
        // if there is a mouseover-event show the tooltip
        if(mouseover){
            d3.select('#label-' + d.id).style('display', 'inline');
            d3.select('#rect-' + d.id).style('display', 'inline');
            // determine color of circle before mouse over
            // to restore color on mouse out
            currentColorOfCircle = d3.select('#circle-' + d.id).attr('fill');
            d3.select('#circle-' + d.id).attr('fill', '#757575');
        }
        // otherwise there is a mouseout-out, then hide the tooltip
        else{
            d3.select('#label-' + d.id).style('display', 'none');
            d3.select('#rect-' + d.id).style('display', 'none');
            // if circle d is currently clicked restore originally color of circle
            if(d.id === selectedCircleId){
                d3.select('#circle-' + d.id).attr('fill', d.color);
            }
            else{
                d3.select('#circle-' + d.id).attr('fill', currentColorOfCircle);
            }
        }
    }

    /**
     * Show modal.
     */
    function showModal(d) {
        var popup = $('#popup-jump-graph');
        if (d.id !== 'issue') {
            popup.modal('show');
            var splitted = d.id.split('_'),
                uid = splitted[splitted.length - 1];
            new AjaxGraphHandler().getJumpDataForGraph(uid);
        }
    }

    /**
     * Select uid.
     */
    function selectUid(id) {
        var splitted = id.split('-');
        return splitted[splitted.length - 1];
    }

     /**
     * Highlight incoming and outgoing edges of selected node.
     *
     * @param edges: all edges of graph
     * @param circleId: id of selected node
     */
    function showPartOfGraph(circleId) {
        // edges with selected circle as source or as target
        var edgesCircleId = [];
        // select all incoming and outgoing edges of selected circle
        edges.forEach(function (d) {
            var circleUid = selectUid(circleId);
            if (isVisible.support && selectUid(d.target.id) === circleUid && d.color === colors.green) {
                edgesCircleId.push(d);
            }
            else if (isVisible.attack && selectUid(d.target.id) === circleUid && d.color === colors.red) {
                edgesCircleId.push(d);
            }
            else if ((selectUid(d.source.id) === circleUid || selectUid(d.target.id) === circleUid)
                && ((!isVisible.attack && !isVisible.support) || isVisible.statement)) {
                edgesCircleId.push(d);
            }
        });

        // if isMyStatementsClicked is false gray all elements at each function call,
        // else the graph is colored once gray
        if (!isVisible.statement && !isVisible.support && !isVisible.attack) {
            edges.forEach(function (d) {
                grayingElements(d);
            });
        }
        edgesCircleId.forEach(function (d) {
            highlightElements(d);
        });

        highlightElementsVirtualNodes(edges, edgesCircleId);
    }

    /**
     * Highlight incoming and outgoing edges of virtual node.
     *
     * @param edges
     * @param edgesVirtualNodes
     */
    function highlightElementsVirtualNodes(edges, edgesVirtualNodes) {
        // array with edges from last loop pass
        var edgesVirtualNodesLast = edgesVirtualNodes;
        var isVirtualNodeLeft;
        do {
            // virtual nodes
            var virtualNodes = createVirtualNodesArray(edgesVirtualNodes);
            // edges with a virtual node as source or as target
            edgesVirtualNodes = createVirtualNodesEdgesArray(edges, virtualNodes);
            isVirtualNodeLeft = testVirtualNodesLeft(edgesVirtualNodes, edgesVirtualNodesLast);
            // save array with edges for next loop pass
            edgesVirtualNodesLast = edgesVirtualNodes;

        }
        while (isVirtualNodeLeft);
    }

    /**
     * Create array with virtual nodes.
     *
     * @param edgesVirtualNodes
     * @return Array
     */
    function createVirtualNodesArray(edgesVirtualNodes) {
        var virtualNodes = [];
        edgesVirtualNodes.forEach(function (d) {
            if (d.source.label === '') {
                virtualNodes.push(d.source);
            }
            if (d.target.label === '') {
                virtualNodes.push(d.target);
            }
        });
        return virtualNodes;
    }

    /**
     * Create array which contains edges with virtual node as source or as target.
     *
     * @param edges
     * @param virtualNodes
     * @return Array
     */
    function createVirtualNodesEdgesArray(edges, virtualNodes) {
        var edgesVirtualNodes = [];
        edges.forEach(function (d) {
            virtualNodes.forEach(function (e) {
                if (d.source.id === e.id || d.target.id === e.id) {
                    if ((isVisible.support && d.color === colors.green) || (isVisible.attack && d.color === colors.red)) {
                        edgesVirtualNodes.push(d);
                    }
                    // if button supports or attacks is clicked do not highlight supports or attacks on premise groups
                    if (!((isVisible.support || isVisible.attack) && (d.edge_type === 'arrow') && !isVisible.statement)) {
                        edgesVirtualNodes.push(d);
                    }
                }
            });
        });
        edgesVirtualNodes.forEach(function (d) {
            highlightElements(d);
        });
        return edgesVirtualNodes;
    }

    /**
     * Test whether virtual nodes are left, where not all incoming and outgoing edges are highlighted.
     *
     * @param edgesVirtualNodes
     * @param edgesVirtualNodesLast
     * @return boolean
     */
    function testVirtualNodesLeft(edgesVirtualNodes, edgesVirtualNodesLast) {
        var isVirtualNodeLeft = false;
        edgesVirtualNodes.forEach(function (d) {
            if (d.source.label === '') {
                isVirtualNodeLeft = true;
                // if the edge is already highlighted terminate loop
                edgesVirtualNodesLast.forEach(function (e) {
                    if (d.id === e.id) {
                        isVirtualNodeLeft = false;
                    }
                });
            }
        });
        return isVirtualNodeLeft;
    }

    /**
     * Highlighting components of graph.
     *
     * @param edge: edge that should be highlighted
     */
    function highlightElements(edge) {
        // edges
        d3.select('#link-' + edge.id).style('stroke', edge.color);
        // nodes
        // add border if button support or attack is clicked
        d3.select('#circle-' + edge.source.id).attr('fill', edge.source.color);
        if((isVisible.support || isVisible.attack) && $.inArray(edge.source.id, circleIds) !== -1) {
            d3.select('#circle-' + edge.source.id).attr({fill: edge.source.color, stroke: 'black'});
        }
        d3.select('#circle-' + edge.target.id).attr('fill', edge.target.color);
        if((isVisible.support || isVisible.attack) && $.inArray(edge.target.id, circleIds) !== -1) {
            d3.select('#circle-' + edge.target.id).attr({fill: edge.target.color, stroke: 'black'});
        }
        // arrows
        d3.select("#marker_" + edge.edge_type + edge.id).attr('fill', edge.color);
    }

    /**
     * Graying components of graph.
     *
     * @param edge: edge that should be gray
     */
    function grayingElements(edge) {
        // edges
        d3.select('#link-' + edge.id).style('stroke', colors.light_grey);
        // nodes
        d3.select('#circle-' + edge.source.id).attr('fill', colors.light_grey);
        d3.select('#circle-' + edge.target.id).attr('fill', colors.light_grey);
        // arrows
        d3.select("#marker_" + edge.edge_type + edge.id).attr('fill', colors.light_grey);
    }
}