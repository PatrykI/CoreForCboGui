// Rejestracja kontrolki niestandardowej
sap.ui.define([
    "sap/ui/core/Control",
    "sap/m/MessageToast"
], function(Control, MessageToast) {
    "use strict";
    //-------------------Globals--------------------------
    //1.1 - Busy Dialog
    var oGlobalBusyDialog = new sap.m.BusyDialog();
    //1.2 - Mass Operation Service
    var oMassServiceModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZODATA_CBO_MASS_OPERTATION_SRV/");
    //1.3 - Package count for oData create
    var iCountPackage = 100;
    //----------------------------------------------------


    var CoreForCboGui = Control.extend("coreforcbogui.CoreForCboGui", {
        onRemoveAll: function(cboName, oView){ 
            sap.m.MessageBox.warning("Are you sure you want to delete all data?", {
                title: "Confirm deletion",
                actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                onClose: function(oAction) {
                    if (oAction === sap.m.MessageBox.Action.YES) {
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

                            for(var j=1; j <fieldsNames.length(); j++){
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
        onUpload: function(cboName, oView, oTableItems, uploadModel){
            oGlobalBusyDialog.open();
            var oModel = oView.getModel();
            var fieldsNames = oModel.oMetadata.oMetadata.dataServices.schema[0].entityType[0].property;
            var excelFields = Object.keys(uploadModel.getData()[0]);
            var item = 0;
            var iCount = uploadModel.getProperty("/").length;
            var iGroupId = 0;
            oGlobalBusyDialog.setText(item + " / " + iCount);
            for(var i=0; i<iCount; i++){
                iGroupId = i % iCountPackage;
                var oEntry = {};

                for(var j=1; j <fieldsNames.length; j++){
                    oEntry[fieldsNames[j].name] = uploadModel.getProperty("/"+i+"/"+ excelFields[j-1]);
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