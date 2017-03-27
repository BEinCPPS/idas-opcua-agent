:: CLPPlus startup script.
:: Copyright (c) 2009, IBM Corporation.  All rights reserved.

@echo off



setlocal enabledelayedexpansion


cmd /C "title CLP Plus" 

:: Save current directory
set current_dir=%cd%

:: Avoid overriding of batch commands
set SPATH=%PATH%
set CS=%COMSPEC:\cmd.exe=%
set PATH=!CS!
cd %CS%

:: Find installation directory
set CLPPLUS1=%0
set CLPPLUS2=%CLPPLUS1:"=%
if not "!CLPPLUS2:~-4!" == ".bat" (
    set CLPPLUS=!CLPPLUS2!.bat
) else (
    set CLPPLUS=!CLPPLUS2!
)



set CPATH=.;%SPATH:"=%
for %%i in ("%CLPPLUS%") do set CLPPLUS_PATH1=%%~$CPATH:i
if "!CLPPLUS_PATH1!" == "" (
    set CLPPLUS_PATH=!CLPPLUS!
) else (
    set CLPPLUS_PATH=!CLPPLUS_PATH1!
)

set INSTALL_DIR_BIN=%CLPPLUS_PATH:\clpplus.bat=%
set INSTALL_DIR1=%INSTALL_DIR_BIN:\bin=%
set INSTALL_DIR=%INSTALL_DIR1:\clpplus=%





:: Check for Java 1.5
set JH=
IF DEFINED JAVA_HOME set JH=%JAVA_HOME:"=%



set JH=%JH%\bin;%JH%\jre\bin


IF DEFINED JAVA_HOME (

set JPATH=!JH!;!INSTALL_DIR!\java\jdk\bin;"%CPATH%"
) else (

set JPATH=!INSTALL_DIR!\java\jdk\bin;"%CPATH%"
)


for %%i in (java.exe) do set JAVA_PATH=%%~$JPATH:i 
for %%i in (javaw.exe) do set JAVAW_PATH=%%~$JPATH:i  
if "%JAVA_PATH: =%" == "" (
    echo CLPPlus requires Java 1.5 or higher to execute.
    echo Please ensure Java is in your PATH.
    exit /b 1
)

set INSTALL_DIR=%INSTALL_DIR:"=%


:: Check for clpplus.jar
set SS=%RANDOM%
echo %CLASSPATH% | find /i "clpplus.jar" > %TEMP%\clpplus.%SS%
if errorlevel 1 (
    if exist "%INSTALL_DIR%\tools\clpplus.jar" (
        set CLPPLUS_JAR="%INSTALL_DIR%\tools\clpplus.jar"
    ) else if exist "%INSTALL_DIR%\clpplus\lib\clpplus.jar" (
        set CLPPLUS_JAR="%INSTALL_DIR%\clpplus\lib\clpplus.jar"
    ) else if exist "%INSTALL_DIR%\lib\clpplus.jar" (
        set CLPPLUS_JAR="%INSTALL_DIR%\lib\clpplus.jar"
    ) else if exist "%INSTALL_DIR%\clpplus.jar" (
        set CLPPLUS_JAR="%INSTALL_DIR%\clpplus.jar"
    ) else (
    	cd "%INSTALL_DIR%"
    	dir clpplus.jar /s /b > %TEMP%\clpplus.%SS%
    	if not errorlevel 1 (
    	    set /p CLPPLUS_JAR= < %TEMP%\clpplus.%SS%
    	) else (
    	    echo Could not find clpplus.jar.
            echo Please ensure that your installation completed successfully.
            echo If the problem persists, please locate and add clpplus.jar to your CLASSPATH.
			cd "%current_dir%"
			del /f /q %TEMP%\clpplus.%SS% 2>nul
            exit /b 1
    	)
    )
)



:: Check for jline-0.9.93.jar
echo %CLASSPATH% | find /i "jline-0.9.93.jar" > %TEMP%\clpplus.%SS%
if errorlevel 1 (
    if exist "%INSTALL_DIR%\tools\jline-0.9.93.jar" (
        set JLINE_JAR="%INSTALL_DIR%\tools\jline-0.9.93.jar"
    ) else if exist "%INSTALL_DIR%\clpplus\lib\jline-0.9.93.jar" (
        set JLINE_JAR="%INSTALL_DIR%\clpplus\lib\jline-0.9.93.jar"
    ) else if exist "%INSTALL_DIR%\lib\jline-0.9.93.jar" (
        set JLINE_JAR="%INSTALL_DIR%\lib\jline-0.9.93.jar"
    ) else if exist "%INSTALL_DIR%\jline-0.9.93.jar" (
        set JLINE_JAR="%INSTALL_DIR%\jline-0.9.93.jar"
    ) else (
    	cd "%INSTALL_DIR%"
    	dir jline-0.9.93.jar /s /b > %TEMP%\clpplus.%SS%
    	if not errorlevel 1 (
    		set /p JLINE_JAR= < %TEMP%\clpplus.%SS%
    	) else (
    		echo Could not find jline-0.9.93.jar.
            echo Please ensure that your installation completed successfully.
            echo If the problem persists, please locate and add jline-0.9.93.jar to your CLASSPATH.
			cd "%current_dir%"
			del /f /q %TEMP%\clpplus.%SS% 2>nul
            exit /b 1
    	)
    )
)

:: Check for antlr-3.3-java.jar
echo %CLASSPATH% | find /i "antlr-3.3-java.jar" > %TEMP%\clpplus.%SS%
if errorlevel 1 (
    if exist "%INSTALL_DIR%\tools\rdf\lib\antlr-3.3-java.jar" (
        set ANTLR_JAR="%INSTALL_DIR%\tools\rdf\lib\antlr-3.3-java.jar"
    ) else if exist "%INSTALL_DIR\..\rdf\lib\antlr-3.3-java.jar" (
        set DS_DRIVER_HOME="%INSTALL_DIR:\clpplus=%"
	set ANTLR_JAR="%DS_DRIVER_HOME\rdf\lib\antlr-3.3-java.jar"
    ) else if exist "%INSTALL_DIR%\rdf\lib\antlr-3.3-java.jar" (
        set ANTLR_JAR="%INSTALL_DIR%\rdf\lib\antlr-3.3-java.jar"
    ) else (
    	cd "%INSTALL_DIR%"
    	dir antlr-3.3-java.jar /s /b > %TEMP%\clpplus.%SS%
    	if not errorlevel 1 (
    		set /p ANTLR_JAR= < %TEMP%\clpplus.%SS%
    	) else (
    		echo Could not find antlr-3.3-java.jar.
            echo Please ensure that your installation completed successfully.
            echo If the problem persists, please locate and add antlr-3.3-java.jar to your CLASSPATH.
			cd "%current_dir%"
			del /f /q %TEMP%\clpplus.%SS% 2>nul
            exit /b 1
    	)
    )
)



:: Check for db2jcc.jar
echo %CLASSPATH% | find /i "db2jcc.jar" > %TEMP%\clpplus.%SS%
if errorlevel 1 (
    if exist "%INSTALL_DIR%\tools\db2jcc.jar" (
        set DB2JCC_JAR="%INSTALL_DIR%\tools\db2jcc.jar"
    ) else if exist "%INSTALL_DIR%\clpplus\lib\db2jcc.jar" (
        set DB2JCC_JAR="%INSTALL_DIR%\clpplus\lib\db2jcc.jar"
    ) else if exist "%INSTALL_DIR%\lib\db2jcc.jar" (
        set DB2JCC_JAR="%INSTALL_DIR%\lib\db2jcc.jar"
    ) else if exist "%INSTALL_DIR%\db2jcc.jar" (
        set DB2JCC_JAR="%INSTALL_DIR%\db2jcc.jar"
    ) else (
    	cd "%INSTALL_DIR%"
    	dir db2jcc.jar /s /b > %TEMP%\clpplus.%SS%
    	if not errorlevel 1 (
    		set /p DB2JCC_JAR= < %TEMP%\clpplus.%SS%
    	) else (
    		echo Could not find db2jcc.jar.
            echo Please ensure that your installation completed successfully.
            echo If the problem persists, please locate and add db2jcc.jar to your CLASSPATH.
			cd "%current_dir%"
			del /f /q %TEMP%\clpplus.%SS% 2>nul
            exit /b 1
    	)
    )
)



:: Check for JCC Licence Jar
echo %CLASSPATH% | find /i "db2jcc_license_cisuz.jar" > %TEMP%\clpplus.%SS%
if errorlevel 1 (
    if exist "%INSTALL_DIR%\tools\db2jcc_license_cisuz.jar" (
        set DB2JCC_LIC="%INSTALL_DIR%\tools\db2jcc_license_cisuz.jar"
    ) else if exist "%INSTALL_DIR%\clpplus\lib\db2jcc_license_cisuz.jar" (
        set DB2JCC_LIC="%INSTALL_DIR%\clpplus\lib\db2jcc_license_cisuz.jar"
    ) else if exist "%INSTALL_DIR%\lib\db2jcc_license_cisuz.jar" (
        set DB2JCC_LIC="%INSTALL_DIR%\lib\db2jcc_license_cisuz.jar"
    ) else if exist "%INSTALL_DIR%\db2jcc_license_cisuz.jar" (
        set DB2JCC_LIC="%INSTALL_DIR%\db2jcc_license_cisuz.jar"
    ) else (
    	cd "%INSTALL_DIR%"
    	dir db2jcc_license_cisuz.jar /s /b > %TEMP%\clpplus.%SS% 2> %TEMP%\clpplus.%SS%.2
    	if not errorlevel 1 (
    		set /p DB2JCC_LIC= < %TEMP%\clpplus.%SS%
    	) 
	del /f /q %TEMP%\clpplus.%SS% 2>nul
    )
)

:: Check for apache-mime4j-0.6.jar
echo %CLASSPATH% | find /i "apache-mime4j-0.6.jar" > %TEMP%\clpplus.%SS%
if errorlevel 1 (
    if exist "%INSTALL_DIR%\tools\apache-mime4j-0.6.jar" (
        set APACHE_MIME4J="%INSTALL_DIR%\tools\apache-mime4j-0.6.jar"
    ) else if exist "%INSTALL_DIR%\clpplus\lib\apache-mime4j-0.6.jar" (
        set APACHE_MIME4J="%INSTALL_DIR%\clpplus\lib\apache-mime4j-0.6.jar"
    ) else if exist "%INSTALL_DIR%\lib\apache-mime4j-0.6.jar" (
        set APACHE_MIME4J="%INSTALL_DIR%\lib\apache-mime4j-0.6.jar"
    ) else if exist "%INSTALL_DIR%\apache-mime4j-0.6.jar" (
        set APACHE_MIME4J="%INSTALL_DIR%\apache-mime4j-0.6.jar"
    )
)

:: Check for httpclient-4.3.1.jar
echo %CLASSPATH% | find /i "httpclient-4.3.1.jar" > %TEMP%\clpplus.%SS%
if errorlevel 1 (
    if exist "%INSTALL_DIR%\tools\httpclient-4.3.1.jar" (
        set HTTPCLIENT="%INSTALL_DIR%\tools\httpclient-4.3.1.jar"
    ) else if exist "%INSTALL_DIR%\clpplus\lib\httpclient-4.3.1.jar" (
        set HTTPCLIENT="%INSTALL_DIR%\clpplus\lib\httpclient-4.3.1.jar"
    ) else if exist "%INSTALL_DIR%\lib\httpclient-4.3.1.jar" (
        set HTTPCLIENT="%INSTALL_DIR%\lib\httpclient-4.3.1.jar"
    ) else if exist "%INSTALL_DIR%\httpclient-4.3.1.jar" (
        set HTTPCLIENT="%INSTALL_DIR%\httpclient-4.3.1.jar"
    )
)

:: Check for httpcore-4.3.jar
echo %CLASSPATH% | find /i "httpcore-4.3.jar" > %TEMP%\clpplus.%SS%
if errorlevel 1 (
    if exist "%INSTALL_DIR%\tools\httpcore-4.3.jar" (
        set HTTPCORE="%INSTALL_DIR%\tools\httpcore-4.3.jar"
    ) else if exist "%INSTALL_DIR%\clpplus\lib\httpcore-4.3.jar" (
        set HTTPCORE="%INSTALL_DIR%\clpplus\lib\httpcore-4.3.jar"
    ) else if exist "%INSTALL_DIR%\lib\httpcore-4.3.jar" (
        set HTTPCORE="%INSTALL_DIR%\lib\httpcore-4.3.jar"
    ) else if exist "%INSTALL_DIR%\httpcore-4.3.jar" (
        set HTTPCORE="%INSTALL_DIR%\httpcore-4.3.jar"
    )
)

:: Check for httpmime-4.3.1.jar
echo %CLASSPATH% | find /i "httpmime-4.3.1.jar" > %TEMP%\clpplus.%SS%
if errorlevel 1 (
    if exist "%INSTALL_DIR%\tools\httpmime-4.3.1.jar" (
        set HTTPMIME="%INSTALL_DIR%\tools\httpmime-4.3.1.jar"
    ) else if exist "%INSTALL_DIR%\clpplus\lib\httpmime-4.3.1.jar" (
        set HTTPMIME="%INSTALL_DIR%\clpplus\lib\httpmime-4.3.1.jar"
    ) else if exist "%INSTALL_DIR%\lib\httpmime-4.3.1.jar" (
        set HTTPMIME="%INSTALL_DIR%\lib\httpmime-4.3.1.jar"
    ) else if exist "%INSTALL_DIR%\httpmime-4.3.1.jar" (
        set HTTPMIME="%INSTALL_DIR%\httpmime-4.3.1.jar"
    )
)

:: Check for JSON4J_Apache.jar
echo %CLASSPATH% | find /i "JSON4J_Apache.jar" > %TEMP%\clpplus.%SS%
if errorlevel 1 (
    if exist "%INSTALL_DIR%\tools\JSON4J_Apache.jar" (
        set JSON4J_APACHE="%INSTALL_DIR%\tools\JSON4J_Apache.jar"
    ) else if exist "%INSTALL_DIR%\clpplus\lib\JSON4J_Apache.jar" (
        set JSON4J_APACHE="%INSTALL_DIR%\clpplus\lib\JSON4J_Apache.jar"
    ) else if exist "%INSTALL_DIR%\lib\JSON4J_Apache.jar" (
        set JSON4J_APACHE="%INSTALL_DIR%\lib\JSON4J_Apache.jar"
    ) else if exist "%INSTALL_DIR%\JSON4J_Apache.jar" (
        set JSON4J_APACHE="%INSTALL_DIR%\JSON4J_Apache.jar"
    )
)

:: Check for commons-logging-1.1.3.jar
echo %CLASSPATH% | find /i "commons-logging-1.1.3.jar" > %TEMP%\clpplus.%SS%
if errorlevel 1 (
    if exist "%INSTALL_DIR%\tools\commons-logging-1.1.3.jar" (
        set COMMONS_LOGGING="%INSTALL_DIR%\tools\commons-logging-1.1.3.jar"
    ) else if exist "%INSTALL_DIR%\clpplus\lib\commons-logging-1.1.3.jar" (
        set COMMONS_LOGGING="%INSTALL_DIR%\clpplus\lib\commons-logging-1.1.3.jar"
    ) else if exist "%INSTALL_DIR%\lib\commons-logging-1.1.3.jar" (
        set COMMONS_LOGGING="%INSTALL_DIR%\lib\commons-logging-1.1.3.jar"
    ) else if exist "%INSTALL_DIR%\commons-logging-1.1.3.jar" (
        set COMMONS_LOGGING="%INSTALL_DIR%\commons-logging-1.1.3.jar"
    )
)

del /f /q %TEMP%\clpplus.%SS% 2>nul


:: Restore current directory
cd "%current_dir%"

:: Prepare classpath
set CP1=%CLASSPATH:"=%
set CP2=%CLPPLUS_JAR%;%GTERM_JAR%;%JLINE_JAR%;%ANTLR_JAR%;%DB2JCC_JAR%;%CP1%;%DB2JCC_LIC%;%APACHE_MIME4J%;%HTTPCLIENT%;%HTTPCORE%;%HTTPMIME%;%JSON4J_APACHE%;%COMMONS_LOGGING%
set CP=%CP2:"=%




:: Restore PATH
set PATH=!SPATH!


 :: @echo on

:: IF "%1" == "-nw"  "%JAVA_PATH%" -classpath "%CP%" jline.ConsoleRunner com.ibm.clpplus.CLPPlus %* & goto exit

:: "%JAVAW_PATH%" -classpath "%CP%" com.ibm.clpplus.CLPPlus %* 

:: Invoke CLPPlus
:: "%JAVA_PATH%" -classpath "%CP%" jline.ConsoleRunner com.ibm.clpplus.CLPPlus %*


 
"%JAVA_PATH%" -Ddb2.jcc.charsetDecoderEncoder=3 -classpath "%CP%" com.ibm.clpplus.CLPPlus %* 2>NUL

:exit
exit /b %errorlevel%


:: end-of-file
