// Rejestracja kontrolki niestandardowej
sap.ui.define([
    "sap/ui/core/Control",
    "sap/m/MessageToast"
], function(Control, MessageToast) {
    "use strict";
    //------------------Imports---------------------------
    //1. To read excel files
    var jQueryScript = document.createElement('script');
    jQueryScript.setAttribute('src', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.2/xlsx.js');
    document.head.appendChild(jQueryScript);
    //----------------------------------------------------

    //-------------------Globals--------------------------
    //1.1 - Mass Operation Service
    var oMassServiceModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZODATA_CBO_MASS_OPERTATION_SRV/");
    //1.2 - Package count for oData create
    var iCountPackage = 100;
    //----------------------------------------------------


    var CoreForCboGui = Control.extend("coreforcbogui.CoreForCboGui", {
        onRemoveAll: function(cboName, oView){ 
            sap.m.MessageBox.warning("Are you sure you want to delete all data?", {
                title: "Confirm deletion",
                actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                onClose: function(oAction) {
                    if (oAction === sap.m.MessageBox.Action.YES) {
                        var oGlobalBusyDialog = new sap.m.BusyDialog();
                        oGlobalBusyDialog.open();
                        oMassServiceModel.callFunction("/MassDelete", {
                            method: "POST",
                            urlParameters:{"CBOName": cboName},
                            success: function(data, response) {
                                oView.mAggregations.content[0].oParent._aParsedContent[0].mAggregations.content._oTable.getModel().refresh(true);
                                oGlobalBusyDialog.close();
                              },
                              error: function(oError) {
                                console.log(oError)
                                oGlobalBusyDialog.close();
                              }
                        });
                    }
                }
            });
        },
        onRemoveDuplicates: function(cboName, oView, aFields){
            var oGlobalBusyDialog = new sap.m.BusyDialog();
            oGlobalBusyDialog.open();
            oMassServiceModel.callFunction("/DuplicateDelete", {
                method: "POST",
                urlParameters:{"CBOName": cboName, "Fields": aFields.join(", ")},
                success: function(data, response) {
                    oView.mAggregations.content[0].oParent._aParsedContent[0].mAggregations.content._oTable.getModel().refresh(true);
                    oView.getController().closeDialog();
                    MessageToast.show("Deletion completed.");
                    oGlobalBusyDialog.close();
                  },
                  error: function(oError) {
                    console.log(oError)
                    oGlobalBusyDialog.close();
                  }
            });
        },onCopy: function(cboName, oView) {
            sap.m.MessageBox.warning("Are you sure you want to copy the selected data?", {
                title: "Confirm copying",
                actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                onClose: function(oAction) {
                    if (oAction === sap.m.MessageBox.Action.YES) {
                        var oGlobalBusyDialog = new sap.m.BusyDialog();
                        oGlobalBusyDialog.open();
                        
                        var oModel = oView.getModel();
                        var fieldsNames = oModel.oMetadata.oMetadata.dataServices.schema[0].entityType[0].property;
                        var selectedItems = oView.mAggregations.content[0].oParent._aParsedContent[0].mAggregations.content._oTable.getSelectedContexts();
                        var items = 0;
                        var iCount = selectedItems.length;
                        oGlobalBusyDialog.setText(items + " / " + iCount);
                        for(var i=0; i<iCount; i++){
                            var item = selectedItems[i].getObject();
                            
                            var oEntry = {};

                            for(var j=1; j <fieldsNames.length; j++){
                                oEntry[fieldsNames[j].name] = item[fieldsNames[j].name];
                            }

                            oModel.create("/"+cboName+"/", oEntry,{
                                success: function(data) {
                                    items++;
                                    oGlobalBusyDialog.setText(items + " / " + iCount);
                                    if(items == selectedItems.length)  {
                                        oView.mAggregations.content[0].oParent._aParsedContent[0].mAggregations.content._oTable.getModel().refresh(true);
                                        MessageToast.show("Copying completed.");
                                        oGlobalBusyDialog.close();
                                    }    
                                },
                                error: function(oError) {
                                    console.log(oError);
                                    oGlobalBusyDialog.close();
                                }
                            });
                        }
                    }
                }
            });
        },
        loadExcelFile: function(oEvent, oView){
            var oGlobalBusyDialog = new sap.m.BusyDialog();
            oGlobalBusyDialog.open();
            
            var oModel = oView.getModel();
            var fieldsNames = oModel.oMetadata.oMetadata.dataServices.schema[0].entityType[0].property;
            var errorExcel = false;
            var file = oEvent.getParameter("files") && oEvent.getParameter("files")[0];

            var that = this;
            this.uploadModel = new sap.ui.model.json.JSONModel();
            var excelData = [];

            if (file && window.FileReader) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var data = e.target.result;
                    var workbook = XLSX.read(data, {
                        type: 'binary'
                    });
                    
                    // Here is your object for every sheet in workbook
                    excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[workbook.SheetNames[0]]); 
                     
                    //Columns checking
                    var keys = Object.keys(excelData[0]);
                    for(var i=1; i<fieldsNames.length; i++){
                        if(!keys.includes(fieldsNames[i].extensions[0].value)){
                            errorExcel = true;
                            sap.m.MessageBox.error("Not found column: "+ fieldsNames[i].extensions[0].value + "!!!", 
                                {
                                title: "Excel error!!!",
                                actions: [sap.m.MessageBox.Action.OK],
            
                            });
                        }
                    }
                    // Number formatting and data checking
                    const regex = /[0-9]/;
                    var error = false;
                    for(var i=0; i< excelData.length && !errorExcel; i++){
                        for(var j=1; j<fieldsNames.length && !errorExcel; j++){
                            if(fieldsNames[j].type == "Edm.String"){
                                if((""+ excelData[i][fieldsNames[j].extensions[0].value]).length > fieldsNames[j].maxLength){
                                    errorExcel = true;
                                    sap.m.MessageBox.error("Failed to retrieve data from Excel file!!! \n Col: "
                                            + fieldsNames[j].extensions[0].value 
                                            + ", Row: "+ (i+1) +" Character limit exceeded!!!", 
                                        {
                                        title: "Excel error!!!",
                                        actions: [sap.m.MessageBox.Action.OK],
                    
                                    });
                                }
                            }else if(fieldsNames[j].type == "Edm.Boolean"){
                                if( excelData[i][fieldsNames[j].extensions[0].value].toLowerCase() == "yes"
                                    || excelData[i][fieldsNames[j].extensions[0].value].toLowerCase() == "true"){
                                    excelData[i][fieldsNames[j].extensions[0].value] = true;
                                }else if(excelData[i][fieldsNames[j].extensions[0].value].toLowerCase() == "no"
                                    || excelData[i][fieldsNames[j].extensions[0].value].toLowerCase() == "false"){
                                    excelData[i][fieldsNames[j].extensions[0].value] = false;
                                }else{
                                
                                    errorExcel = true;
                                    sap.m.MessageBox.error("Failed to retrieve data from Excel file!!! \n Col: "
                                            + fieldsNames[j].extensions[0].value 
                                            + ", Row: "+ (i+1) +" Failed to recognize the data!!!", 
                                    {
                                        title: "Excel error!!!",
                                        actions: [sap.m.MessageBox.Action.OK]
                                    });
                                    
                                }
                            }else if(fieldsNames[j].type == "Edm.Decimal"){
                                var last = 0;
                                var str = "" + excelData[i][fieldsNames[j].extensions[0].value];
                                var firstSymbol = true;
                                var scale = parseInt(fieldsNames[j].scale);
                                for(var k= str.length-1; k>=0  && !errorExcel; k--){
                                    if(!regex.test(str[k])){
                                        if(firstSymbol){
                                            last = k;
                                            firstSymbol = false;
                                            if(scale == 0){
                                                str = str.slice(0, k) + str.slice(k + 1);
                                            }else{
                                                str = str.slice(0, k) + "." + str.slice(k + 1);
                                                if(str.length - k!=scale+1){
                                                    var num = parseFloat(str);
                                                    str = num.toFixed(scale);
                                                    error = true;
                                                }
                                            }
                                        }else{
                                            if(last - 4 < k){
                                                errorExcel = true;
                                                sap.m.MessageBox.error("Failed to retrieve data from Excel file!!! \n Col: "
                                                        + fieldsNames[j].extensions[0].value 
                                                        + ", Row: "+ (i+1) +" The number could not be recognized!!!", 
                                                {
                                                    title: "Excel error!!!",
                                                    actions: [sap.m.MessageBox.Action.OK]
                                                }); 
                                            }
                                            str = str.slice(0, k) + str.slice(k + 1);
                                        }
                                    }
                                }
                                excelData[i][fieldsNames[j].extensions[0].value] = str;
                            }
                        }
                    }
                    if(error && !errorExcel){
                        sap.m.MessageBox.warning("The numerical data has been rounded!!!", 
                        {
                            title: "Excel warning!!!",
                            actions: [sap.m.MessageBox.Action.OK],
                    
                        });
                    }
                    if(!errorExcel){
                        // Setting the data to the local model 
                        that.uploadModel.setData(excelData);
                        
                        let oTable = oView.byId("ExcelDataTable");
                        oTable.setModel(that.uploadModel);

                        let oTemplate = new sap.m.ColumnListItem(
                            {cells: [ 
                                new sap.m.FlexBox({
                                    items:[
                                        new sap.ui.core.Icon({src: "sap-icon://circle-task"}),
                                        new sap.m.Text({text : "test", visible: false})
                                    ]
                                }),
                            ]
                        }); 
                        for(var i=1; i<fieldsNames.length; i++){
                            oTemplate.addCell(new sap.m.Text({text : "{"+fieldsNames[i].extensions[0].value+"}"}))
                        }
                        var path = "/";
                        oTable.bindItems(path, oTemplate);

                        oView.byId("upload").setProperty("enabled", true);
                    }
                    oGlobalBusyDialog.close();
                };
                
                reader.onerror = function (ex) {
                    console.log(ex);
                };
                reader.readAsBinaryString(file);
                
            }
        },
        onUpload: function(cboName, oView, oTableItems){
            var oGlobalBusyDialog = new sap.m.BusyDialog();
            oGlobalBusyDialog.open();
            var oModel = oView.getModel();
            var fieldsNames = oModel.oMetadata.oMetadata.dataServices.schema[0].entityType[0].property;
            var excelFields = Object.keys(this.uploadModel.getData()[0]);
            var item = 0;
            var iCount = this.uploadModel.getProperty("/").length;
            var iGroupId = 0;
            oGlobalBusyDialog.setText(item + " / " + iCount);
            for(var i=0; i<iCount; i++){
                iGroupId = i % iCountPackage;
                var oEntry = {};

                for(var j=1; j <fieldsNames.length; j++){
                    oEntry[fieldsNames[j].name] = this.uploadModel.getProperty("/"+i+"/"+ excelFields[j-1]);
                }
                
                oModel.create("/"+cboName+"/", oEntry,{
                    success: function(data) {
                        oTableItems[item].getCells()[0].getItems()[0].setProperty("src", "sap-icon://message-success");
                        oTableItems[item].getCells()[0].getItems()[0].setProperty("color", "green");
                        item++;
                        oGlobalBusyDialog.setText(item + " / " + iCount);
                        if(item === iCount){
                            oView.mAggregations.content[0].oParent._aParsedContent[0].mAggregations.content._oTable.getModel().refresh(true);
                            oGlobalBusyDialog.close();
                        } 
                      },
                      error: function(oError) {
                        oTableItems[item].getCells()[0].getItems()[0].setProperty("src", "sap-icon://error");
                        oTableItems[item].getCells()[0].getItems()[0].setProperty("color", "red");
                        oTableItems[item].getCells()[0].getItems()[1].setProperty("text", JSON.parse(oError.responseText).error.message.value);
                        oTableItems[item].getCells()[0].getItems()[1].setProperty("visible", true);
                        item++;
                        oGlobalBusyDialog.setText(item + " / " + iCount);
                        if(item === iCount){
                            oView.mAggregations.content[0].oParent._aParsedContent[0].mAggregations.content._oTable.getModel().refresh(true);
                            oGlobalBusyDialog.close();
                        } 
                      },
                      groupId: iGroupId
                });
            }
        }
    });

    return CoreForCboGui;
});