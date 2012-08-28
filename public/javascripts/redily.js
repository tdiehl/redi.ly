
$("#add").click(function(){
	createLink();
});
$("#url").keypress(function(e){
	if(e.which == 13) {
		createLink();
	}
});

function createLink() {
	$.post("/create", {"url": $("#url").val()},
        function(data){
            $("#alerts").append("<div id='alert-success' class='alert alert-success'><button type='button' class='close' data-dismiss='alert'>x</button><span style='padding-right:10px;'>Added short url " + window.location + data + "</span><span class='badge badge-success'>copy</span></div>");
            $("#url").val("http://redi.ly/"+data);
        }
    );
}

