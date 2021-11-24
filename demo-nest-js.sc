Program DemoNestjs;

type
TScriptCommand = record
MethodName: String;
ArgsLen: Word;
CommadID: String;
Args: Array of Variant;
IsValid: Boolean;
end;

type TConverterFunction = function(const Input: String): Variant;

// var convertersFunc: array[0..2] of TConverterFunction;

function ConverterFactory(const ConverterType: Byte; const Input: String): Variant;
begin
  case ConverterType of
    0: begin
      Result:= StrToInt(Input);
      Exit;
    end;
    1: begin
      Result:= StrToBool(Input);
      Exit;
    end;  
  end;
end;

//function ArgumentConverterToInteger(const Input: String): Variant;
//begin
//  Result := StrToInt(Input);
//end;
//
//function ArgumentConverterToBoolean(const Input: String): Variant;
//begin
//  Result := StrToBool(Input);
//end;

procedure CallScriptMethod(const ScriptCommand: TScriptCommand; var ResultsList: TStringList);
var tmpResult: Variant;
begin
  case ScriptCommand.ArgsLen of
    0: begin                
      case ScriptCommand.MethodName of
        'Dead': begin
          ResultsList.Append(ScriptCommand.CommadID + '=' + ToString(Dead));
        end;
        'Backpack': begin
            ResultsList.Append(ScriptCommand.CommadID + '=' + ToString(Backpack));
        end;                                                                      
        'Self': begin
            ResultsList.Append(ScriptCommand.CommadID + '=' + ToString(Self));
        end;
      end;
    end;
    1: begin
      case ScriptCommand.MethodName of
        'Wait': begin
          Wait(ConverterFactory(1, ScriptCommand.Args[1]));
          ResultsList.Append(ScriptCommand.CommadID + '=' + ToString(True));
        end;
        'AddToSystemJournal': begin
            AddToSystemJournal(ScriptCommand.Args[0]);
            ResultsList.Append(ScriptCommand.CommadID + '=' + ToString(True));
        end;
      end;
    end;
    2: begin
      // AddToDebugJournal(ScriptCommand.MethodName);
      case ScriptCommand.MethodName of
        'FindType': begin
            tmpResult := FindType(ConverterFactory(1, ScriptCommand.Args[0]), ConverterFactory(1, ScriptCommand.Args[1]));
            ResultsList.Add(ScriptCommand.CommadID + '=' + ToString(tmpResult));
        end;
      end;
    end;
  end;
end;

function parseCommand(Input: String): TScriptCommand;
var
tList: TStringList;
tArgs: TStringList;
i: Integer;
s, tmpStr: String;
begin
  Result.IsValid := False;
  if Input = '' then Exit;
  tList := TStringList.Create;
  tList.Delimiter := ' ';
  tList.QuoteChar := '|';
  tList.StrictDelimiter := True;
  tList.DelimitedText := Input;

  if tList.Count > 0 then begin 
    tmpStr := tList.strings[1];
    Result.MethodName := tmpStr;
    tmpStr :=tList.strings[2]; 
    Result.ArgsLen := tmpStr.ToInteger;
    tmpStr :=tList.strings[0];
    Result.CommadID := tmpStr;

    SetLength(Result.Args, Result.ArgsLen);
    tArgs := TStringList.Create;
    tArgs.StrictDelimiter := True;
    s := tList.strings[3];
    tArgs.CommaText := s;
    // AddToSystemJournal(tArgs.CommaText);
    // AddToSystemJournal(s);
    for i := 0 to Result.ArgsLen-1 do
        Result.Args[i] := tArgs.strings[i];
    tArgs.Free;
    Result.IsValid := True;
  end;
  tList.Free;
end;

var
sendList: TStringList;
response: String;
tmpCommand: TScriptCommand;
// commandResult: Variant;
begin
  // convertersFunc[0] := @ArgumentConverterToInteger;
  // convertersFunc[1] := @ArgumentConverterToBoolean;    
  sendList := TStringList.Create;
  
  while true do begin
    response := HTTP_Post('http://localhost:3000/stealth/message', nil);
    AddToSystemJournal('Received message: ' + response);                                       
    tmpCommand := parseCommand(response);                
    AddToSystemJournal(ToString(tmpCommand.IsValid));
    if tmpCommand.IsValid then begin                                     
      CallScriptMethod(tmpCommand, sendList);
      AddToSystemJournal(ToString(sendList.Count));
      if sendList.Count > 0 then begin
        HTTP_Post('http://localhost:3000/stealth/message', sendList);
        AddToSystemJournal('Clearing list count: ' + ToString(sendList.Count));
        sendList.Clear;          
        AddToSystemJournal('Cleared list count: ' + ToString(sendList.Count));
      end; 
    end;
    Wait(1000);
    response := '';
  end;
  sendList.Free;
end.
