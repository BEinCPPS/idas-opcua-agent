SELECT 
Descr, MeasUnit 
FROM dbo.DAC_Acq_Meas_T_L 
WHERE IDAcqMeasureType = @measureCod
AND  IDLang = @language