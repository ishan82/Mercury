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
      	<li><a href="reg.php">Registrati</a></li>
      </ul>
    </div>
  </div>
</div>

<div class="container" data-spy="scroll">
	<h2>Bentornato, effettua l'accesso al pannello di controllo.</h2><br />
  <form class="well bord span3 offset4" id="auth" enctype="application/x-www-form-urlencoded">
  
    <label>Indirizzo email</label>
    <input class="input-large" id="email" size="16" type="email">
    
    <label>Password</label>
    <input class="input-large" id="password" size="16" type="password">
    
    <label class="checkbox">
      <input type="checkbox">Ricordami
    </label>
    
    <button type="submit" class="btn btn-long btn-info">Accedi</button>
  </form>
</div>
<div class="well" style="text-align:center;">
	&copy; 2012
</div>
</body>
</html>