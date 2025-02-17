This is the vMix integration.

## Shared control

Similarly to the TriCaster integration, only resources (features) that have corresponding mappings explicitly defined are controlled by the TSR and will have commands generated. Those resources may receive commands resetting them to TSR-defined defaults when no timeline objects are present on corresponding layers. The resources are divided as follows:

- inputs - each input individually, when a corresponding mapping of type `MappingVmixType.Input` exists
- audio channels - each audio channel (input), when a corresponding mapping of type `MappingVmixType.AudioChannel` exists
- audio buses - each audio bus, when a corresponding mapping of type `MappingVmixType.AudioBus` exists
- outputs - each output individually, when a corresponding mapping of type `MappingVmixType.Output` exists
- overlays - each overlay individually, when a corresponding mapping of type `MappingVmixType.Overlay` exists
- recording - when a mapping of type `MappingVmixType.Recording` exists
- streaming - when a mapping of type `MappingVmixType.Streaming` exists
- external - when a mapping of type `MappingVmixType.External` exists
- mix inputs and main mix - each mix individually when at least one of corresponding mappings of type `MappingVmixType.Program` or `MappingVmixType.Preview` exists

## Current limitations

- For most purposes, referencing inputs by numbers is recommended. Mappings refrencing inputs by names are suitable only when the names are known to be unique. However, the state read from vMix primarily uses input numbers, so restart of the TSR when names were used in the mappings and on the timeline, might trigger some unwanted transitions. Mixing string and numeric names may lead to even more unexpected results.
- Adding more than one input with the same `filePath` is not supported.

## Known bugs

- Commands adding inputs may be sent multiple times, resulting in the same input being added more than once. Fixed in release51.
