package no.nav.data.polly.systeminformation;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/system-information")
public class SystemInformationController {
    private final SystemInformationService service;

    @GetMapping("/{code}")
    public SystemInformationResponse get(@PathVariable String code) { return service.get(code); }

    @PutMapping("/{code}")
    public SystemInformationResponse save(@PathVariable String code, @Valid @RequestBody SystemInformationRequest request) {
        return service.save(code, request);
    }

    @ExceptionHandler({ObjectOptimisticLockingFailureException.class, DataIntegrityViolationException.class})
    public ResponseEntity<Map<String, String>> conflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message",
                "Informasjonen er endret av en annen bruker. Last inn på nytt før du lagrer."));
    }
}
