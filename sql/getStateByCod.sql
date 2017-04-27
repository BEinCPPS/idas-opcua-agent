SELECT 
Descr 
FROM dbo.Automas_Status_L 
WHERE IDAutomaStatus = @stateCod
AND  IDLang = @language