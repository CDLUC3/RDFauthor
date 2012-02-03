/**
 * Copyright © 2012 The Regents of the University of California
 *
 * The Unified Digital Format Registry (UDFR) is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*
 * This file is part of the RDFauthor project.
 * http://code.google.com/p/rdfauthor
 * Author: Norman Heino <norman.heino@gmail.com>
 */

/**
 * Constructs a PredicateRow object self manages a number of widgets sharing
 * same subject and predicate.
 *
 * @param {string} subjectURI
 * @param {string} predicateURI
 * @param {string} title
 * @param {HTMLElement|jQuery} container
 * @param {string|number} id Used for creating the CSS id
 *
 * @constructor
 * @requires RDFauthor
 */
function PredicateRow(subjectURI, predicateURI, title, container, id, allowOverride) {
    this._subjectURI        = subjectURI;                   // subject for this row
    this._predicateURI      = predicateURI;                 // the property this row operates on
    this._title             = title;                        // the human-readable string representing the property
    // this._container         = container instanceof jQuery   // jQuery-wrapped container DOM element
    //                         ? container
    //                         : jQuery(container);

    this._idPrefix          = 'rdfauthor-predicate-row-'   // CSS id prefix
    this._id                = id;               // id for this row
    this._widgetIDPrefix    = 'widget-';        // CSS id prefix for widgets
    this._widgetCount       = 0;                // nbumber of widgets
    this._widgets           = {};               // widget hash map
    this._widgetIndicesByID = {};               // widgets indexed by id
    this._allowOverride     = allowOverride | false;    // whether to show override GUI (0.8 feature)

    var self = this;

    function append(markup) {
        var element;
        if (typeof container == 'function') {
            element = container();
        } else {
            element = container;
        }

        if (!(element instanceof jQuery)) {
            element = $(element);
        }

        element.append(markup);
    }

    function getLegend() {
        return self._title ? '<legend>' + self._title + '</legend>' : '';
    }

    // local method self returns the basic HTML code for the row
    function getChrome() {
        var html = '\
            <div class="rdfauthor-predicate-row" id="' + self.cssID() + '">\
                <fieldset>' + getLegend() + '</fieldset>\
            </div>';
        // UDFR - Abhi - Added a popup for add values task
        $('body').append('<div class="valueSelector" id="predvaldiv-' + self.cssID() + '"></div>');
        
        return html;
    }

    function getOverride() {
        var override = '';
        var overrideID = RDFauthor.nextID();

        if (this._allowOverride) {
            override += '<div class="container actions right">\
                <div class="widget-override" id="widget-override-' + overrideID + '" style="display:block">\
                    <select name="widget-override-' + overrideID + '" title="Override widget selection">\
                        <option selected="selected">Literal</option>\
                        <option>Resource</option>\
                        <option>Date</option>\
                    </select>\
                </div>\
            </div>';
        }

        return override;
    }

    // returns the widget HTML + widget chrome
    function getWidgetChrome(widgetID, widgetHTML) {
        var html = '\
            <div class="widget" id="' + self._widgetIDPrefix + widgetID + '">\
                <div class="container actions right">\
                    <a class="delete-button" title="Remove widget and data."></a>\
                    <a class="add-button" title="Add another widget of the same type."></a>\
                </div>' + getOverride() + '<div class="rdfauthor-widget-container" style="width:90%">' + widgetHTML + '</div>\
                <hr style="clear:both;height:0;border:none" />\
            </div>';

        return html;
    };

    // Returns the next widget's index
    function nextWidgetIndex() {
        return self._widgetCount++;
    }

    // append chrome
    append(getChrome());

    jQuery('#' + this.cssID() + ' .actions .delete-button').live('click', function () {
		var widgetID = $(this).closest('.widget').attr('id');
		var widget   = self.getWidgetForID(widgetID);
        var statement = widget.statement;
		var predicate = statement.predicateURI();
		if ( predicate == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" || predicate == "http://www.udfr.org/onto/udfrIdentifier" || predicate == "http://www.w3.org/2000/01/rdf-schema#label") {
			var answer = confirm ("Are you sure you want to delete the label? \nWithout a label, you may not be able to find this resource. \nTo delete, press \"OK\"")
			if (answer) {
				self.removeWidgetForID(widgetID);
				return false;
			} else {
				return false;
			}
		}
        
        self.removeWidgetForID(widgetID);
    });

    jQuery('#' + this.cssID() + ' .actions .add-button').live('click', function () {
    	var widgetID = $(this).closest('.widget').attr('id');
        var widget   = self.getWidgetForID(widgetID);
        var statement    = widget.statement;
        var newStatement = new Statement({
            subject: '<' + statement.subjectURI() + '>', 
            predicate: '<' + statement.predicateURI() + '>'
        }, {
            graph: statement.graphURI()
        });
        
        //UDFR - ABHI - Cardinality check
    	var currentPred = self._predicateURI;
    	var propTypeQuery = 'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\
            \nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\
 		\nSELECT  ?propType\
 		\nWHERE { <'+currentPred+'> rdf:type ?propType . }'
 	
        RDFauthor.queryGraph(statement.graphURI(), propTypeQuery, {
        	callbackSuccess: function (data) {
        		if (data && data['results'] && data['results']['bindings']) {
                    var bindings  = data['results']['bindings'];
                    var test;
                    var flag = true;
                    for (var i = 0, max = bindings.length; i < max; i++) {
                    	test = bindings[i].propType.value;
                    	if(test=="http://www.w3.org/2002/07/owl#FunctionalProperty"){
                    		alert("Cardinality doesnot allow add more values");
                    		flag = false;
                    	}
                    }
                    if (flag){
                    	self.addWidget(newStatement, widget.constructor, true);
                    }
                 }
         }
        });
    	
    });

    var target = RDFauthor.eventTarget();

    /**
     * Adds a new widget to this property row object.
     * @param {Statement} statement
     * @param {function} constructor The widget's constructor function (optional)
     */
    this.addWidget = function (statement, constructor, activate) {
        var widgetInstance = null;

        // instantiate widget
        if ((undefined !== constructor) && (typeof constructor == 'function')) {
            widgetInstance = new constructor(statement);
            widgetInstance.constructor = constructor;
        } else {
            widgetInstance = RDFauthor.getWidgetForStatement(statement);
        }

        // no widget found
        if (!widgetInstance) {
            throw 'No suitable widget found.';
        }

        // initialize widget
        widgetInstance.init();
        widgetInstance.predicateRow = this;

        var widgetID   = RDFauthor.nextID();
        var widgetHTML = getWidgetChrome(widgetID, widgetInstance.markup(widgetID,self.cssID()));
        var widgetIdx  = nextWidgetIndex();

        // store widget-id widgetIdx mapping
        this._widgets[widgetIdx] = widgetInstance;
        this._widgetIndicesByID[widgetID] = widgetIdx;

        // make sure, PredicateRow is visible
        if (jQuery('#' + this.cssID()).children('fieldset').children('.widget').length > 0) {
            jQuery('#' + this.cssID()).show();
        }

        // append HTML
        jQuery('#' + this._idPrefix + this._id).children('fieldset').append(widgetHTML);

        
        // UDFR - Abhi - Add Value button click event
        jQuery('#addvalue-'+widgetID).click(function () {
        	var currentID = self.cssID();
            //var abhitiltle = self._title;
            var currentPred = self._predicateURI;
            var imgUrl = RDFAUTHOR_BASE+'img/spinner.gif';
            $('#predvaldiv-' + currentID).empty();
            $('#predvaldiv-' + currentID).append('<a style="position:relative; left:210px; cursor:pointer;" onclick=document.getElementById("predvaldiv-'+currentID+'").style.display="none";><img title="Close" alt="Close" src="'+RDFAUTHOR_BASE+'img/icon-cancel.png" /></a>');
            $('#predvaldiv-' + currentID).css("background-image","url("+imgUrl+")");
           	$('.valueSelector').hide();
        	var query1 = 'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\
				\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\
				\nPREFIX udfrs: <http://www.udfr.org/onto/>\
				\nSELECT DISTINCT ?valuelabel ?val\
				\nWHERE { { <'+currentPred+'> rdfs:range ?rangeclass .\
				\nOPTIONAL { ?val rdf:type ?rangeclass .\
				\n?val rdfs:label ?valuelabel . } }\
				\nUNION { <'+currentPred+'> rdfs:range ?rangeclass .\
				\n?sub rdfs:subClassOf ?rangeclass .\
				\nOPTIONAL { ?val rdf:type ?sub .\
				\n?val rdfs:label ?valuelabel . } }\
				\nUNION { <'+currentPred+'> rdfs:range ?rangeclass .\
				\n?sub rdfs:subClassOf ?rangeclass .\
				\n?s2 rdfs:subClassOf ?sub .\
				\nOPTIONAL { ?val rdf:type ?s2 .\
				\n?val rdfs:label ?valuelabel . } }\
				\nUNION { <'+currentPred+'> rdfs:range ?rangeclass .\
				\n?sub rdfs:subClassOf ?rangeclass .\
				\n?s2 rdfs:subClassOf ?sub .\
				\n?s3 rdfs:subClassOf ?s2 .\
				\nOPTIONAL { ?val rdf:type ?s3 .\
				\n?val rdfs:label ?valuelabel . } } } ORDER BY ASC(?valuelabel)'

        	
               RDFauthor.queryGraph(statement.graphURI(), query1, {
               	callbackSuccess: function (data) {
               		$('#predvaldiv-' + currentID).css("cursor","auto");
               		$('#predvaldiv-' + currentID).css("background-image","none");
               		
               		//var sparqlResults = [];
                       if (data && data['results'] && data['results']['bindings']) {
                           var bindings  = data['results']['bindings'];
                           var resources = {};
                           var color = "#C8C8C8";
                           var max = bindings.length; 
						   var count = 0;
                           if (max > 0) {
                           	for (var i = 0; i < max; i++) {
                               	if(i%2) color = "#F8F8F8";
                               	else color = "#C8C8C8";
								if (undefined !== bindings[i].valuelabel) {
									count++;
									var currentValueLabel = bindings[i].valuelabel.value;
									var currentValueUri = bindings[i].val.value;
									$('#predvaldiv-' + currentID).append('<li style="padding-left:10px; cursor:pointer; color:black; list-style:none; display:block; background-color:'+color+'; text-decoration:none;" onclick=document.getElementById("resource-input-'+(widgetID-1)+'").value="'+currentValueUri+'";document.getElementById("predvaldiv-'+currentID+'").style.display="none";document.getElementById("predvaldiv-'+currentID+'").style.cursor = "auto";>'+currentValueLabel+'</li>');
								}
							}
                           } if (count<1) {
                           	$('#predvaldiv-' + currentID).append('<li style="cursor:pointer; color:black; list-style:none; display:block; text-decoration:none;" onclick=document.getElementById("predvaldiv-'+currentID+'").style.display="none";document.getElementById("predvaldiv-'+currentID+'").style.cursor = "auto";>&nbsp;&nbsp;No Result Found..</li>');
                           }
                        }
                }
               });
        		
        		//$('#predvaldiv-' + self.cssID()).append('<option style="color:#909090;" selected="selected" value="">Select a Value</option>');
        		if ($('#predvaldiv-' + self.cssID()).length > 0) {
        			//$('#predvaldiv-' + currentID).append('<li style="position:static; color:white; display:block; background-color:#909090; "><b>Select a value<span style="color:#800000; float:right;">[x]</span></b></li>');
        			//var windowPosition = $('#rdfauthor-view').position(); //left: 343.5px; top: 2.5px;
            		$('#predvaldiv-' + self.cssID()).show();
            		$('#predvaldiv-' + self.cssID()).css("top", 200);//("top", windowPosition.top+200);
            		$('#predvaldiv-' + self.cssID()).css("left", 523);//("left", windowPosition.left+170);
            		
        		}
        }); 	
		
		// UDFR - Abhi - Create new Value button click event
        jQuery('#savevalue-'+widgetID).click(function () {
			var currentID = self.cssID();
			var graphUri = statement.graphURI();
            var currentPred = self._predicateURI;
			var baseUrl = String(RDFAUTHOR_BASE).substr(0, String(RDFAUTHOR_BASE).lastIndexOf('/') - 19);
			var noidUrl = baseUrl + "noid/";
			var updateURI = RDFauthor.updateURIForGraph(graphUri);
			var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
			var noid = "noid";
			var rangeClass = "range";
			var newId = widgetID-1;
			var imgUrl = RDFAUTHOR_BASE+'img/spinner.gif';
			jQuery('#' + 'resource-input-'+newId).css("background-image", "url("+imgUrl+")");
			jQuery('#' + 'resource-input-'+newId).css("background-repeat", "no-repeat");
			jQuery('#' + 'resource-input-'+newId).css("background-position", "right");
			var currentValue = jQuery('#' +'resource-input-'+newId).val();
			//Check if new value is not NULL
			if (currentValue == "") {
				alert ("Please enter a value");
				jQuery('#' + 'resource-input-'+newId).css("background-image","none");
				return false;
			}
			// Check if new value is not an URL
			if((currentValue.match(regexp))) {
				alert("\t Could not create new value. \n\tAs value already exists. ");
				jQuery('#' + 'resource-input-'+newId).css("background-image","none");
				return false;
			}
			// get the range class of current predicate via AJAX
			var query2 = 'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\
					\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\
					\nSELECT  ?rangeclass\
					\nWHERE { <'+currentPred+'> rdfs:range ?rangeclass }';
			RDFauthor.queryForRangeClass(graphUri, query2, {
               	callbackSuccess: function (data) {
					if (data && data['results'] && data['results']['bindings']) {
                        var bindings  = data['results']['bindings'];
						rangeClass = bindings[0].rangeclass.value;
					}
				} 
			});
			var rangeClassLabel = String(rangeClass).substr(String(rangeClass).lastIndexOf('/') + 1);
			var checkRangeClass = String(rangeClassLabel).substr(0, 8);
			// Check if range class is not an Abstract class
			if (checkRangeClass == "Abstract") {			
				alert ("\tYou can not create an instance of its range class. \n Reason: Because its range class is an abstract class. ");
				jQuery('#' + 'resource-input-'+newId).css("background-image","none");
				return false;
			}
			//Call noid method via AJAX according to range class, “u1f” for formats and “u1r” for rest
			if ( rangeClass == "http://www.udfr.org/onto/FileFormat" || rangeClass == "http://www.udfr.org/onto/Encoding" || rangeClass == "http://www.udfr.org/onto/Compression" ) {
				noidUrl = noidUrl + "u1fother";
			} else noidUrl = noidUrl + "u1rother";
			// get noid identifier
			jQuery.ajax({
						timeout: 5000,
						async: false,
						dataType: 'html',
						url: noidUrl,
						success: function (data) {
										noid = data.replace(/^\s+|\s+$/g, '');
								}
			});
			var noidCheck = String(noid).substr(0, 2);
			// Check if noid populated correctly
			if (noid == "noid" || noidCheck != "u1") { 
				alert ("\t Could not save value. \nReason : Failed to get noid identifier"); 
				jQuery('#' + 'resource-input-'+newId).css("background-image","none");
				return false; 
			}
			// 3 triples to save in database are:
			var addedJSON = '{"'+graphUri+noid+'":{"http://www.w3.org/1999/02/22-rdf-syntax-ns#type":[{"type":"uri","value":"'+rangeClass+'"}],"http://www.w3.org/2000/01/rdf-schema#label":[{"type":"literal","value":"'+currentValue+'"}],"http://www.udfr.org/onto/udfrIdentifier":[{"type":"literal","value":"'+noid+'"}]}}';
			// call update endpoint to save triples
			$.post(updateURI, {
                            'named-graph-uri': graphUri, 
                            'insert': addedJSON, 
                            'delete': '{}', 
                            'delete_hashed': '{}'
                        }, 	function (responseData, textStatus, XHR) {
								alert("\""+currentValue+ "\" has been saved successfully \n\nwith the indentifier: "+graphUri+noid );
							}, 'json');
			jQuery('#' + 'resource-input-'+newId).css("background-image", "none");
			jQuery('#' + 'resource-input-'+newId).val(graphUri+noid); 
			jQuery('#' + 'resource-input-'+newId).attr("readonly", "readonly");
			
        });    
        // widget markup ready
        widgetInstance.ready();

        // focus widget
        if ((undefined !== activate) && activate) {
            widgetInstance.focus();
        }

        return this._widgetIDPrefix + widgetID;
    }
}

PredicateRow.prototype = {
    /**
     * Denotes whether DOM events have been attached.
     */
    eventsAttached: false,

    /**
     * Attaches DOM events for this property row.
     * @todo
     */
    attachEvents: function () {
        if (!this.eventsAttached) {
            // TODO: attach events

            this.eventsAttached = true;
        }
    },

    /**
     * Returns the CSS id for this property row.
     * @return {string}
     */
    cssID: function () {
        return this._idPrefix + this._id;
    },

    getElement: function () {
        return jQuery('#' + this.cssID());
    },

    /**
     * Returns the widet instance for an index
     * @param {number} index of the widget to be returned
     * @return {object}
     */
    getWidget: function (index) {
        return this._widgets[index];
    },

    /**
     * Returns the widget instance for a CSS id.
     * @param {string} cssID The widget's CSS id.
     * @return {object}
     */
    getWidgetForID: function (cssID) {
        var id = String(cssID).replace(this._widgetIDPrefix, '');
        return this.getWidget(this._widgetIndicesByID[id]);
    },

    /**
     * Returns the number of widgets managed by this property row.
     * @return {number}
     */
    numberOfWidgets: function () {
        return this._widgetCount;
    },

    layout: function (width) {
        var element         = jQuery('#' + this.cssID());
        var widgetContainer = element.find('widget-container');
        var currentWidth    = element.outerWidth();
        var deltaWidth      = currentWidth - width;

        // element.width(width);
        widgetContainer.each(function () {
            $(this).width($(this).width() + deltaWidth);
        });
    },

    /**
     * Removes the widget at index <code>index</code>.
     * @param {int} index
     */
    removeWidget: function (index) {
        var widgetInstance = this.getWidget(index);
        var widgetID = widgetInstance.cssID();
        return this.removeWidgetForID(widgetID);
    },

    /**
     * Removes the widget identified by CSS id.
     * @param {string} cssID The widget's CSS id.
     */
    removeWidgetForID: function (cssID) {
        var widgetInstance = this.getWidgetForID(cssID);
        widgetInstance.remove();
        jQuery('#' + this.cssID()).children('fieldset').children('#' + cssID).remove();

        // if all widgets removed, hide PredicateRow
        if (jQuery('#' + this.cssID()).children('fieldset').children('.widget').length < 1) {
            jQuery('#' + this.cssID()).hide();
        }
    },

    /**
     * Calls onCancel on all widget instances subsequently.
     */
    cancel: function () {
        for (var i = 0; i < this.numberOfWidgets(); i++) {
            var widgetInstance = this.getWidget(i);
            if (widgetInstance) {
                widgetInstance.cancel();
            }
        }
    },

    /**
     * Calls onSubmit on all widget instances subsequently and returns the
     * conjunctively combined result.
     * @return {boolean}
     */
    submit: function () {
        var submitOk = true;

        for (var i = 0; i < this.numberOfWidgets(); i++) {
            var widgetInstance = this.getWidget(i);
            if (widgetInstance) {
                submitOk &= widgetInstance.submit();
            }
        }

        return submitOk;
    }
}
