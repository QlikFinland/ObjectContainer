define( [ "qlik", "css!./ObjectContainer.css"
],
function (qlik) {

	var app = qlik.currApp(this);
	
	var mItems;
	var listItemsOld;
	var visibleOld;
	var listIdOld;
	var itemtypeOld;

	function getMasterObjects() {
		return new Promise(function(resolve, reject) {
			app.getList('masterobject').then(function(model) {

                app.destroySessionObject(model.layout.qInfo.qId);

                if(!model.layout.qAppObjectList || !model.layout.qAppObjectList.qItems) return resolve({value: '', label: 'No Master Objects'});

                return resolve( model.layout.qAppObjectList.qItems.map(function(item) {
                    return {
                        value: item.qMeta.title,
                        label: item.qMeta.title
                    };
                }));

            });
		});
	}

	var item = {
		label: {
			type: "string",
			ref: "label",
			label: "Label",
			expression: "optional"
		},
		itemType: {
			type: "string",
			component: "dropdown",
			label: "Type",
			ref: "itemtype",
			options: [{value: 'subtitle', label: 'Subtitle'}, {value: 'visualization', label: 'Visualization'}],
			defaultValue: 'subtitle'
		},
		qLabel: {
			ref: "qLabel",
			label: "Subtitle Text",
			type: "string",
			defaultValue: "",
			expression: "optional",
			show: function ( data ) {
				return data.itemtype == 'subtitle';
			}
		},
		list: {
			type: "string",
			component: "dropdown",
			label: "Master Object",
			ref: "qName",
			options: function () {
				return getMasterObjects().then(function (items) {
					return items;
				});
			},
			show: function ( data ) {
				return data.itemtype == 'visualization';
			}
		},
		height: {
			ref: "height",
			label: "Visualization Height",
			type: "string",
			defaultValue: "200px",
			expression: "optional",
			show: function ( data ) {
				return data.itemtype == 'visualization';
			}
		},
		hidden: {
			ref: "hidden",
			label: "Calculation Condition",
			type: "number",
			expression: "optional",
			defaultValue: 1
		}
	};

	var layout = {
		bg: {
			ref: "bg",
			label: "Background Color",
			type: "string",
			defaultValue: "#ffffff",
			expression: "optional"
		},
		border: {
			ref: "border",
			label: "Border Color",
			type: "string",
			defaultValue: "#ffffff",
			expression: "optional"
		},
		font: {
			ref: "font",
			label: "Font",
			type: "string",
			defaultValue: "Helvetica",
			expression: "optional"
		},
		title: {
			ref: "title",
			label: "Title",
			type: "string",
			defaultValue: "",
			expression: "optional"
		},
		tbg: {
			ref: "tbg",
			label: "Title Background Color",
			type: "string",
			defaultValue: "#ffffff",
			expression: "optional"
		},
		tfont: {
			ref: "tfont",
			label: "Title Font Color",
			type: "string",
			defaultValue: "#000000",
			expression: "optional"
		},
		stfont: {
			ref: "stfont",
			label: "Subtitle Font Color",
			type: "string",
			defaultValue: "#000000",
			expression: "optional"
		}
	};

	var itemSection =  {
		type: "array",
		ref: "listItems",
		label: "Container Items",
		itemTitleRef: "label",
		allowAdd: true,
		allowRemove: true,
		allowMove: true,
		addTranslation: "Add Item",
		items: item
	};

	var layoutSection = {
		type: "items",
		label: "Layout",
		items: layout
	};

	var testItem = {
		type: "string",
		ref: "test",
		label: "test",
		expression: "optional"
	};

	var testItem2 = {
		type: "string",
		ref: "test",
		label: "test2",
		expression: "optional"
	};

	return {
		support : {
			snapshot: false,
			export: false,
			exportData : false
		},
		initialProperties: {
            listItems: []
        },
		definition: {
	    	type: "items",
			component: "accordion",
			items: {
				settings: {
					uses: "settings",
					items: {
						list: itemSection,
						layout: layoutSection
					}
				}
			},
		},
		paint: function ($element, layout) {
			var html = '<div class="bg"><div id="title" class="title"></div></div>';
			var firstPaint = false;
			var tid = $element.parent().parent().parent().parent().parent().parent().attr('tid'); // id of the extension
			
			if (listItemsOld == undefined || listItemsOld == null) {
				listItemsOld = [];
				visibleOld = [];
				itemtypeOld = [];
				listIdOld = [];
			}

			// only once draw the html
			if ($element.find('.bg').length == 0) {
				$element.html(html);
				
				var header = $element.parent().parent().prev();
				
				header.parent().parent().css('background-color','transparent');
				header.parent().parent().css('border-width','0');
				
				header.parent().css('background-color','transparent');
				header.parent().css('padding','0px');
				
				header.hide();
				
				firstPaint = true;
			
			} else {
				firstPaint = false;
			}

			// update the layout
			$element.find('.bg').css({'background-color': layout.bg, 'border-style': 'solid', 'border-color': layout.border});
			$element.find('#title').text(layout.title);
			$element.find('#title').css({'background-color': layout.tbg, 'color': layout.tfont, 'font-family': layout.font});

			// update items
			getMasterItems();
			
			// fetch master items
			function getMasterItems() {
				app.getList('masterobject').then(function(model) {
					mItems = [];
					
					if(model.layout.qAppObjectList.qItems) {
						for (var i = 0; i < model.layout.qAppObjectList.qItems.length; i++) {
							mItems[model.layout.qAppObjectList.qItems[i].qMeta.title] = model.layout.qAppObjectList.qItems[i].qInfo.qId;
						}

						renderItems();
					}
					
					var qId = model.layout.qInfo.qId;
					
					if (listIdOld[tid] != null && listIdOld[tid] != qId) { // destroy old qlik sense object
						app.destroySessionObject(listIdOld[tid]);
						
						listIdOld[tid] = qId;
					}
				});
			};

			// render items
			function renderItems() {
				var redraw = false;
				var listItems = [];
				var visible = [];
				var itemtype = [];
				var changeVisibility = [];
				
				if (firstPaint || listItemsOld[tid].length != layout.listItems.length) {
					redraw = true;
				}
				
				for (var i = 0; i < layout.listItems.length; i++) {
					if (firstPaint || layout.listItems[i].qName != listItemsOld[tid][i] || layout.listItems[i].itemtype != itemtypeOld[tid][i]) {
						redraw = true;
					}

					if (firstPaint || layout.listItems[i].hidden != visibleOld[tid][i]) {
						changeVisibility.push(true);

					} else {
						changeVisibility.push(false);
					}

					listItems.push(layout.listItems[i].qName);
					visible.push(layout.listItems[i].hidden);
					itemtype.push(layout.listItems[i].itemtype);
				}
				
				listItemsOld[tid] = listItems;
				visibleOld[tid] = visible;
				itemtypeOld[tid] = itemtype;
				
				//console.log('redraw', redraw);
				//console.log('first paint', firstPaint);
				
				if (redraw || firstPaint) { // remove old divs before adding new ones
					$element.find('.subtitle').remove();
					$element.find('.q-object').remove();
				}
					
				for (var i = 0; i < layout.listItems.length; i++) {
					var id = null;
					
					//console.log(layout.listItems[i]);

					// if subtitle
					if (layout.listItems[i].itemtype == 'subtitle') {
						id = 'st-' + i;
						
						//console.log('subtitle', id);
						
						if (redraw || firstPaint) { // add div for subtitle
							$element.find('.bg').append('<div id="' + id + '" class="subtitle margin-lr">' + layout.listItems[i].qLabel + '</div>');
						}
						
						$element.find('#' + id).html(layout.listItems[i].qLabel);
						$element.find('.subtitle').css({'color': layout.stfont, 'font-family': layout.font});
						
						if(redraw || changeVisibility[i] || firstPaint) { //check if changes are necessary to visibility
							if (visible[i]) {
								$element.find('#' + id).show();

							} else {
								$element.find('#' + id).hide();
							}
							
							//console.log('visible', visible[i]);
						}
						
					} else { // if master object
						id = mItems[layout.listItems[i].qName]; // get master object's id
						
						var htmlId = mItems[layout.listItems[i].qName] + '_' + tid;

						//console.log('tid', $element.parent().parent().parent().parent().parent().parent().attr('tid'));
						//console.log('visu', id);

						if (redraw || firstPaint) { // add div for visualization
							$element.find('.bg').append('<div id="' + htmlId + '" class="q-object margin-lr margin-tb" ></div>');
						}

						$element.find('.bg').find('#' + htmlId).css({'height': layout.listItems[i].height, 'width': '96%'});

						// render the object
						if(redraw || changeVisibility[i] || firstPaint) { //check if changes are necessary to visibility
							if (visible[i]) {
								$element.find('#' + htmlId).show();
								
								if (id != undefined) {
									app.getObject(htmlId, id).then(function() { });
								}

							} else {
								$element.find('#' + htmlId).html('');
								$element.find('#' + htmlId).hide();
							}
						}
					}
				}
			};
		}
	};

} );

