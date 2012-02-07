<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<title>Untitled Document</title>
<link rel="stylesheet" type="text/css" href="css/css/css.css" />
<link rel="stylesheet" type="text/css" href="css/css/bootstrap-responsive.css" />
<link rel="stylesheet" type="text/css" href="css/css/bootstrap.css" />
<script language="javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.js"></script>
<script language="javascript" src="js/bootstrap.js"></script>
</head>

<body>
<div class="navbar navbar-fixed-top">
  <div class="navbar-inner">
    <div class="container-fluid">
      <a class="brand spac" href="#">mercury cms</a>
      <ul class="nav">
        <li><a href="index.php">Home</a></li>
      </ul>
      <ul class="nav pull-right">
      	<li><a href="auth.php">Accedi</a></li>
      </ul>
    </div>
  </div>
</div>

<div class="container" data-spy="scroll">
	<h2>Benvenuto, effettua la registrazione compilando tutti i campi sottostanti.</h2><br />
	<form class="well bord span5 offset3 form-horizontal" id="auth" enctype="application/x-www-form-urlencoded">
  <fieldset>
  	<div class="control-group">
    	<label>Nome completo</label>
      <div class="controls">
      	<input class="input-xmedium" id="name" size="16" type="text">
      </div>
    </div>
    
    <div class="control-group">
    	<label>Indirizzo email</label>
      <div class="controls">
      	<input class="input-xmedium" id="email" size="16" type="email">
      </div>
    </div>
    
    <div class="control-group">
    	<label>Password</label>
      <div class="controls">
      	<input class="input-xmedium" id="password" size="16" type="password">
      </div>
    </div>
    
    <div class="control-group">
    	<label>Ripeti password</label>
      <div class="controls">
      	<input class="input-xmedium" id="password2" size="16" type="password">
      </div>
    </div>
    
    <button type="submit" class="btn btn-long btn-info">Registrati</button>
  </fieldset>
  </form>
</div>
<div class="well" style="text-align:center;">
	&copy; 2012
</div>
</body>
</html>