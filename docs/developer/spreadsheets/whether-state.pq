// Whether's current reading as an Excel table of Field and Value, one row per payload field.
// Paste into Power Query's Advanced Editor and name the query Whether; setup and lookups:
// docs/developer/spreadsheets/README.md. Field is the payload path ("scores.tightness.pause.line",
// "guidance.doNow.0"), the same path the Google Sheets function accepts as a key.
// Reads GET https://whether.work/api/agent?view=state: public, no key; choose Anonymous access.
let
    Source = Json.Document(Web.Contents("https://whether.work/api/agent", [Query = [view = "state"]])),
    Flatten = (value as any, path as text) as list =>
        if value is record then
            List.Combine(
                List.Transform(
                    Record.FieldNames(value),
                    (name) => @Flatten(Record.Field(value, name), if path = "" then name else path & "." & name)
                )
            )
        else if value is list then
            List.Combine(
                List.Transform(
                    List.Positions(value),
                    (index) => @Flatten(value{index}, path & "." & Text.From(index))
                )
            )
        else
            {{path, value}},
    Whether = Table.FromRows(Flatten(Source, ""), type table [Field = text, Value = any])
in
    Whether
